import { useParams } from "react-router-dom";

export default function QuizPage() {
  const { topicId } = useParams();

  return (
    <section id="quiz" className="max-w-4xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold">Quiz: {topicId}</h1>
      <p className="mt-2 text-[var(--color-text-muted)]">
        Adaptive assessment questions will appear here.
      </p>
      {/* TODO: quiz renderer, scoring, feedback */}
    </section>
  );
}
