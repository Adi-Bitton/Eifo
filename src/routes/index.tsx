import { createFileRoute } from "@tanstack/react-router";
import { EifoApp } from "@/components/EifoApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Eifo? — איפה שווה עכשיו בתל אביב" },
      {
        name: "description",
        content:
          "Eifo? — מפה חיה של מבצעי אוכל ושתייה עכשיו בתל אביב. האפי האוור, עסקיות ודילים סביבך.",
      },
      { property: "og:title", content: "Eifo? — איפה שווה עכשיו בתל אביב" },
      {
        property: "og:description",
        content: "מפה חיה של מבצעי אוכל ושתייה עכשיו בתל אביב.",
      },
    ],
  }),
  component: EifoApp,
});
