import { useState } from 'react';
import Modal from './Modal';
import { quizQuestions } from '../data/mock';
import { useApp } from '../context/AppContext';
export default function QuizModal({ onClose }: { onClose: () => void }) {
  const { awardQuiz } = useApp();
  const [i, setI] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const q = quizQuestions[i];
  const next = () => {
    const s = score + (sel === q.answer ? 1 : 0);
    setScore(s);
    if (i < quizQuestions.length - 1) { setI(i + 1); setSel(null); return; }
    if (s >= 4) setResult(awardQuiz() ? 'Great job! You earned +15 Green Points.' : 'Great job! Quiz points were already claimed earlier.');
    else setResult('Review the Waste Awareness tips and try again.');
  };
  return (
    <Modal title="Segregation Quiz" onClose={onClose}>
      {result ? (
        <div className="text-center">
          <p className="text-3xl font-bold text-primary">{score} / {quizQuestions.length}</p>
          <p className="mt-2 text-sm">{result}</p>
          <button className="btn-primary mt-5" onClick={onClose}>Close</button>
        </div>
      ) : (
        <div>
          <p className="text-xs text-muted">Question {i + 1} of {quizQuestions.length}</p>
          <p className="mt-1 font-medium">{q.q}</p>
          <div className="mt-3 space-y-2" role="radiogroup" aria-label="Answer options">
            {q.options.map((o, idx) => (
              <button key={o} role="radio" aria-checked={sel === idx} onClick={() => setSel(idx)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${sel === idx ? 'border-accent bg-light font-medium' : 'border-line hover:bg-canvas'}`}>{o}</button>
            ))}
          </div>
          <button className="btn-primary mt-5 w-full" disabled={sel === null} onClick={next}>{i === quizQuestions.length - 1 ? 'Finish' : 'Next'}</button>
        </div>
      )}
    </Modal>
  );
}
