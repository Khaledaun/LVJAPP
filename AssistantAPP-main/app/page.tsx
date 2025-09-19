import Link from 'next/link'
export default function Home() {
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">LVJ Case Assistant</h1>
      <p className="text-sm text-muted-foreground">Welcome! Jump into the cases list:</p>
      <Link href="/cases" className="underline underline-offset-4">Go to Cases</Link>
    </main>
  )
}
