import { Sidebar } from "./components/layout/Sidebar";

export default function App() {
  return (
    <div className="flex h-full">
      <Sidebar />

      {/* Content pane, Win11 NavigationView style: white surface with a rounded
          top-left corner sitting on the mica-toned window background. */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-tl-lg border-l border-t border-black/8 bg-white">
        {/* Track list area — built in task 1.9 */}
        <section className="flex-1 overflow-y-auto p-6">
          <p className="text-sm text-neutral-400">
            Select a playlist to see its tracks.
          </p>
        </section>

        {/* Player area — built in tasks 1.10–1.13 */}
        <footer className="flex h-28 shrink-0 items-center justify-center border-t border-black/8 bg-[#fbfbfb]">
          <p className="text-sm text-neutral-400">Nothing is playing.</p>
        </footer>
      </main>
    </div>
  );
}
