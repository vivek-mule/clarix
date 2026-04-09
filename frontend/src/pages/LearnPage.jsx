import { useParams } from "react-router-dom";

export default function LearnPage() {
  const { topicId } = useParams();

  return (
    <section id="learn" className="max-w-4xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold">Learning: {topicId}</h1>
      <p className="mt-2 text-[var(--color-text-muted)]">
        Adaptive content will be rendered here based on your knowledge level.
      </p>
      {/* TODO: adaptive content viewer, progress bar */}
    </section>
  );
}
