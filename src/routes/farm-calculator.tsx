import { createFileRoute, Link } from "@tanstack/react-router";
import { FarmCostCalculator } from "@/components/coffee-calculator/FarmCostCalculator";

const TITLE = "Coffee Farm Cost Calculator — CCAK";
const DESC = "Estimate tree population, seedlings and establishment, maintenance, harvesting and consultancy costs for Kenyan coffee farms.";

export const Route = createFileRoute("/farm-calculator")({
  component: FarmCalculatorPage,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://coffeechampions.co.ke/farm-calculator" }],
  }),
});

function FarmCalculatorPage() {
  return (
    <>
      <div className="bg-[var(--coffee-deep)] px-4 py-2 text-sm">
        <Link to="/" style={{ color: "var(--cream)" }} className="underline-offset-2 hover:underline">← Coffee Champions Association of Kenya</Link>
      </div>
      <FarmCostCalculator />
    </>
  );
}
