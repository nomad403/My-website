interface ProjectSummaryProps {
  text: string
  className: string
}

export default function ProjectSummary({ text, className }: ProjectSummaryProps) {
  const paragraphs = text.split("\n").filter(Boolean)

  return (
    <div className={className}>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className={index > 0 ? "mt-2" : undefined}>
          {index === 0 && paragraphs.length > 1 ? (
            <strong className="font-medium">{paragraph}</strong>
          ) : (
            paragraph
          )}
        </p>
      ))}
    </div>
  )
}
