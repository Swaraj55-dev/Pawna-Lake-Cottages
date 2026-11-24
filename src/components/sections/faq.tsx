import { faqs } from "@/config/site";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Reveal } from "@/components/motion/reveal";
import { SectionHeading } from "./section-heading";

export function Faq() {
  if (faqs.length === 0) return null;
  return (
    <section aria-labelledby="faq-title" className="py-20 md:py-28">
      <div className="container-page max-w-3xl">
        <SectionHeading id="faq-title" eyebrow="FAQ" title="Good to know" align="center" />
        <Reveal>
          <Accordion className="rounded-3xl bg-card px-6 ring-1 ring-ink/5 md:px-8">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={String(i)} className="border-ink/10">
                <AccordionTrigger className="min-h-14 items-center py-4 text-base font-semibold hover:no-underline md:text-lg">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="pb-5 text-base text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
