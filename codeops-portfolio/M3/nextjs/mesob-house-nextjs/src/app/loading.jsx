import PageLoader from "@/components/ui/PageLoader";

// Shown instantly while any route segment without its own loading.jsx streams in.
export default function Loading() {
  return <PageLoader />;
}
