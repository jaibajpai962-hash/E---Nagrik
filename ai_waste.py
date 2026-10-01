"""AI-Powered Waste Detection & Smart Segregation.

Self-contained module, clearly separated into:
  1. model loading          -> _load_session()
  2. image preprocessing    -> preprocess()
  3. prediction             -> predict()
  4. waste-category mapping -> map_category() / categorize()
  5. disposal recommendation -> disposal_guidance()

Model: MobileNetV2-12 (int8, CPU) pretrained on ImageNet-1k from the ONNX model
zoo, running locally through ONNX Runtime. It is a real image classifier - no
random/fake results - and needs no GPU.
"""

import json
import os
import re
import threading
import urllib.request

from PIL import Image, ImageOps

BASE = os.path.abspath(os.path.dirname(__file__))
MODEL_DIR = os.path.join(BASE, "ai_models")
MODEL_FILE = os.path.join(MODEL_DIR, "mobilenetv2-12-int8.onnx")
LABELS_FILE = os.path.join(MODEL_DIR, "imagenet-simple-labels.json")

MODEL_URLS = [
    "https://github.com/onnx/models/raw/main/validated/vision/classification/mobilenet/model/mobilenetv2-12-int8.onnx",
    "https://media.githubusercontent.com/media/onnx/models/main/validated/vision/classification/mobilenet/model/mobilenetv2-12-int8.onnx",
]
LABELS_URLS = [
    "https://raw.githubusercontent.com/anishathalye/imagenet-simple-labels/master/imagenet-simple-labels.json",
]

INPUT_SIZE = 224
MEAN = (0.485, 0.456, 0.406)
STD = (0.229, 0.224, 0.225)
TOP_K = 10
LOW_CONFIDENCE = 50  # % - at or below this the answer becomes "Mixed / Uncertain"
MAX_PIXELS = 40_000_000

# ---------------------------------------------------------------- categories
WET = "Wet / Biodegradable"
DRY = "Dry / Recyclable"
HAZ = "Hazardous Waste"
EWA = "E-Waste"
SAN = "Sanitary Waste"
GLASS = "Glass"
MIXED = "Mixed / Uncertain"

DISPOSAL = {
    WET: "Place in the wet/organic waste collection. Compostable material may be composted where appropriate.",
    DRY: "Keep recyclable material reasonably clean and place it in dry/recyclable waste collection.",
    HAZ: "Do not mix with regular household waste. Use an authorized hazardous-waste collection facility where available.",
    EWA: "Do not dispose of electronic items with regular waste. Use an authorized e-waste collection/recycling facility.",
    SAN: "Wrap securely and follow the local sanitary-waste disposal system.",
    GLASS: "Handle broken glass carefully and use the appropriate glass/recycling collection system.",
    MIXED: "Separate the waste manually if possible. AI confidence is insufficient for a reliable single-category recommendation.",
}

LOW_CONFIDENCE_NOTE = "AI confidence is low. Please verify the waste type manually."

# Category of complaint this detection suggests when reporting an issue.
SUGGESTED_COMPLAINT = {
    WET: "Improper Segregation", DRY: "Improper Segregation", GLASS: "Improper Segregation",
    SAN: "Improper Segregation", HAZ: "Illegal Dumping", EWA: "Illegal Dumping", MIXED: "Other",
}

# ------------------------------------------------- 4. waste-category mapping
# Ordered: the first rule that matches a predicted label decides its category.
_RULES = [
    (HAZ, r"hair spray|spray|lighter|matchstick|\bmatch\b|syringe|pill bottle|\bpills?\b|medicine|"
          r"pesticide|insecticide|aerosol|bleach|detergent|disinfectant|fuel|petrol|kerosene|\bacid\b|"
          r"solvent|thinner|insect spray|bug spray|weed killer|fertilizer|\bbattery\b(?! charger)"),
    (EWA, r"cellular|mobile phone|telephone|payphone|\bphone\b|computer|laptop|keyboard|mouse|monitor|"
          r"CRT|\bmodem\b|printer|projector|radio|television|\btv\b|cassette|tape player|hard disk|"
          r"\bdisk\b|joystick|remote control|camera|microphone|typewriter|vacuum cleaner|\bfan\b|"
          r"microwave|toaster|blender|kettle|coffeemaker|washing machine|heater|air conditioner|"
          r"\bswitch\b|\bclock\b|\bwatch\b|machine|appliance|generator|battery charger|charger"),
    (SAN, r"diaper|nappy|sanitary|toilet paper|wet wipe|\btissue\b|handkerchief|nappy"),
    (GLASS, r"beer bottle|wine bottle|whiskey bottle|\bglass\b|goblet|vase|pitcher|\bjar\b|ashtray|"
          r"beaker|flask|hourglass|carafe|decanter"),
    (None, r"turtle|tortoise|fish|frog|snake|lizard|gecko|crocodile|alligator|dinosaur|salamander|newt|"
           r"\bdog\b|puppy|\bcat\b|kitten|\bbird\b|robin|eagle|hawk|owl|parrot|duck|goose|\bhen\b|peacock|"
           r"penguin|ostrich|\bhorse\b|pony|\bcow\b|calf|\bbull\b|ox|sheep|lamb|goat|\bpig\b|elephant|"
           r"giraffe|zebra|lion|tiger|bear|wolf|\bfox\b|deer|antelope|rhinoceros|hippopotamus|kangaroo|"
           r"monkey|ape|chimp|squirrel|rabbit|hare|\bmouse\b|\brat\b|\bbat\b|whale|dolphin|shark|seal|"
           r"crab|lobster|shrimp|snail|slug|octopus|squid|starfish|jellyfish|coral|\bee\b|wasp|\bant\b|"
           r"spider|beetle|butterfly|moth|caterpillar|grasshopper|cricket|dragonfly|mantis|centipede|"
           r"scorpion|hummingbird|pelican|toucan|lobster|squid|seahorse|daisy|sunflower|tulip|rose"),
    (DRY, r"water bottle|soda bottle|\bbottle\b|\bcan\b|plastic|carton|cardboard|\bpaper\b|envelope|notebook|\bmenu\b|crate|"
          r"\bbox\b|bag|tin|milk can|bottle cap|\bmetal\b|aluminum|steel|newspaper|magazine|\bbook\b|wallet|"
          r"purse|\bcup\b|\bmug\b|straw|cutlery|\bfork\b|\bspoon\b|napkin|towel|packaging|wrapper|"
          r"ring binder|folder|clipboard"),
    (WET, r"food|fruit|vegetable|banana|apple|orange|lemon|\blime\b|grape|pear|peach|\bplum\b|cherry|"
          r"strawberry|blueberry|watermelon|pineapple|mango|papaya|pomegranate|\bfig\b|\bdate\b|coconut|"
          r"avocado|tomato|potato|carrot|onion|garlic|cucumber|pumpkin|squash|\bcorn\b|mushroom|broccoli|"
          r"cabbage|lettuce|spinach|pepper|radish|eggplant|\bpea\b|\bbean\b|bread|pizza|burger|sandwich|"
          r"cake|cookie|\bpie\b|donut|burrito|taco|soup|salad|\bstew\b|hot pot|meat|steak|\bchicken\b|"
          r"pork|\bbeef\b|seafood|sushi|\begg\b|cheese|yogurt|\bbutter\b|\bmilk\b|cream|espresso|cappuccino|"
          r"latte|juice|smoothie|honey|\bjam\b|chocolate|candy|ice cream|custard|pudding|cereal|\boat\b|"
          r"peanut|almond|walnut|\bherb\b|spice|marigold|flower|\bleaf\b|leaves|grass|plant"),
]
_COMPILED = [(cat, re.compile(pat, re.IGNORECASE)) for cat, pat in _RULES]


def map_category(label: str):
    """Map a predicted ImageNet label to one of the waste categories (None = no match)."""
    for cat, rx in _COMPILED:
        if rx.search(label):
            return cat
    return None


def categorize(top):
    """top: [(label, probability), ...] -> (category, detected_item, confidence%, low_confidence)."""
    total = sum(p for _, p in top) or 1.0
    best = {}
    for label, p in top:
        cat = map_category(label)
        if cat:
            best[cat] = best.get(cat, 0.0) + p
    # detected item = highest-probability label belonging to the winning category
    if not best:
        item = top[0][0] if top else ""
        return MIXED, item, 0, True
    cat = max(best, key=best.get)
    confidence = int(round(100.0 * best[cat] / total))
    if confidence < LOW_CONFIDENCE:
        # not enough support for one category -> report the model's top guess as uncertain
        return MIXED, top[0][0], confidence, True
    item = next((l for l, _ in top if map_category(l) == cat), top[0][0])
    return cat, item, confidence, False


def disposal_guidance(category: str) -> str:
    return DISPOSAL.get(category, DISPOSAL[MIXED])


# --------------------------------------------------------- 1. model loading
_LOCK = threading.Lock()
_SESSION = None
_LABELS = None


class ModelUnavailable(RuntimeError):
    pass


class ImageError(ValueError):
    pass


def _download(urls, dest, timeout=60):
    os.makedirs(MODEL_DIR, exist_ok=True)
    tmp = dest + ".part"
    last = None
    for url in urls:
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "ENagrik/1.0"}), timeout=timeout) as r, open(tmp, "wb") as fh:
                while True:
                    chunk = r.read(1024 * 256)
                    if not chunk:
                        break
                    fh.write(chunk)
            if os.path.getsize(tmp) > 1024:
                os.replace(tmp, dest)
                return
        except Exception as e:  # network/permission problems -> try next mirror
            last = e
    if os.path.exists(tmp):
        try:
            os.remove(tmp)
        except OSError:
            pass
    raise ModelUnavailable(str(last or "download failed"))


def _load_session():
    """Load (and, if needed, download) the ONNX model + label set once."""
    global _SESSION, _LABELS
    if _SESSION is not None:
        return _SESSION, _LABELS
    with _LOCK:
        if _SESSION is not None:
            return _SESSION, _LABELS
        import onnxruntime as ort  # heavy import, kept out of app startup

        try:
            if not os.path.exists(MODEL_FILE):
                _download(MODEL_URLS, MODEL_FILE)
            if not os.path.exists(LABELS_FILE):
                _download(LABELS_URLS, LABELS_FILE)
            with open(LABELS_FILE, encoding="utf-8") as fh:
                labels = json.load(fh)
            session = ort.InferenceSession(MODEL_FILE, providers=["CPUExecutionProvider"])
        except ModelUnavailable:
            raise
        except Exception as e:
            raise ModelUnavailable(str(e))
        _LABELS, _SESSION = labels, session
        return _SESSION, _LABELS


# ------------------------------------------------------ 2. image preprocessing
def preprocess(raw) -> "object":
    """File bytes -> normalized NCHW float32 array (224x224, ImageNet stats)."""
    import numpy as np

    try:
        img = Image.open(raw)
        img.load()
        img = ImageOps.exif_transpose(img)
        img = img.convert("RGB")
    except Exception:
        raise ImageError("not a readable image")
    if img.width * img.height > MAX_PIXELS:
        raise ImageError("image too large")
    img = ImageOps.fit(img, (INPUT_SIZE, INPUT_SIZE), method=Image.BILINEAR, centering=(0.5, 0.5))
    arr = np.asarray(img, dtype=np.float32) / 255.0
    arr = (arr - np.array(MEAN, dtype=np.float32)) / np.array(STD, dtype=np.float32)
    return arr.transpose(2, 0, 1)[None]


# ------------------------------------------------------------- 3. prediction
def predict(arr) -> list:
    """Run the model once and return the top-K labels with probabilities."""
    import numpy as np

    session, labels = _load_session()
    name = session.get_inputs()[0].name
    logits = session.run(None, {name: arr})[0][0]
    shifted = logits - logits.max()
    exp = np.exp(shifted)
    probs = exp / exp.sum()
    top = probs.argsort()[::-1][:TOP_K]
    return [(labels[i] if i < len(labels) else f"class {i}", float(probs[i])) for i in top]


# ------------------------------------------------------------------ analyse
def analyze(raw) -> dict:
    """Full pipeline: image bytes -> JSON-ready detection result."""
    top = predict(preprocess(raw))
    category, item, confidence, low = categorize(top)
    item_name = item.title() if item else "Unknown"
    title = f"{item_name} waste needs attention" if item_name != "Unknown" else "Waste issue detected"
    description = f"The image appears to contain {item_name.lower()} waste, which falls under {category.lower()} category and needs proper segregation or disposal."
    return {
        "success": True,
        "detected_item": item_name,
        "category": category,
        "confidence": confidence,
        "disposal_guidance": disposal_guidance(category),
        "title": title,
        "description": description,
        "low_confidence": low,
        "low_confidence_note": LOW_CONFIDENCE_NOTE if low else "",
        "suggested_category": SUGGESTED_COMPLAINT[category],
    }
