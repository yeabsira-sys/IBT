export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-12">
      <div className="animate-pulse">
        <div className="h-10 w-48 rounded bg-gray-200" />
        <div className="mt-3 h-5 w-72 rounded bg-gray-200" />

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="rounded-xl border bg-white p-5">
              <div className="h-5 w-24 rounded bg-gray-200" />
              <div className="mt-4 h-7 w-32 rounded bg-gray-200" />
              <div className="mt-4 h-12 rounded bg-gray-200" />
              <div className="mt-5 h-5 w-20 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}