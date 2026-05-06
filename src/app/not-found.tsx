export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="text-8xl mb-4">🏟️</div>
      <h1 className="text-3xl font-bold text-foreground mb-2">Page Not Found</h1>
      <p className="text-muted-foreground mb-8 text-center max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <a
        href="/"
        className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
      >
        &larr; Back to Home
      </a>
    </div>
  )
}
