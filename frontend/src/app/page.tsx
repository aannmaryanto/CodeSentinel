export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">CodeSentinel</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          AI-powered code review for GitHub pull requests.
        </p>
        <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800">
          <p className="text-sm text-zinc-500 dark:text-zinc-500">
            Application foundation initialized.
          </p>
        </div>
      </div>
    </main>
  );
}
