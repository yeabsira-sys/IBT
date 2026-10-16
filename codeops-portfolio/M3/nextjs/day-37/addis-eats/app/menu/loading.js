export default function Loading() {
  return (
    <main className="min-h-screen bg-orange-50 px-6 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="animate-pulse">
          <div className="h-10 w-40 rounded bg-gray-200" />

          <div className="mt-3 h-5 w-64 rounded bg-gray-200" />

          <div className="mt-8 flex gap-3">
            <div className="h-10 w-20 rounded-full bg-gray-200" />
            <div className="h-10 w-24 rounded-full bg-gray-200" />
            <div className="h-10 w-20 rounded-full bg-gray-200" />
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="rounded-xl bg-white p-6">
                <div className="h-6 w-32 rounded bg-gray-200" />

                <div className="mt-4 h-12 rounded bg-gray-200" />

                <div className="mt-5 h-6 w-20 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
