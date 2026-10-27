// "Scripture or myth?" (src/lib/quiz.ts): one claim at a time, judged, then
// answered with the verses quoted from your translation and, for a myth, where
// it came from. The scheduler brings a missed one back soon.

import { useState } from "react";
import { Badge, Button, cn, Spinner } from "@nexis/design";
import { formatRef } from "@/lib/canon";
import { TAGS } from "@/lib/dossiers";
import { useTranslation } from "@/lib/hooks";
import { nextQuestion, QUESTIONS, type Question } from "@/lib/quiz";
import { studyRef } from "@/lib/studies";
import { useStudy } from "@/store/study";

export function QuizShelf() {
  const cards = useStudy((s) => s.quiz);
  const answerQuiz = useStudy((s) => s.answerQuiz);
  const translation = useStudy((s) => s.translation);
  const read = useStudy((s) => s.read);
  const [t] = useTranslation(translation);
  // The question on screen and the guess made, held until "Next" so the answer stays up after it is recorded.
  const [held, setHeld] = useState<{ q: Question; guess: boolean } | null>(null);
  const q = held?.q ?? nextQuestion(cards);
  const asked = QUESTIONS.filter((x) => cards[x.id]).length;
  const due = QUESTIONS.filter((x) => cards[x.id] && cards[x.id].due <= Date.now()).length;

  const guess = (g: boolean) => {
    if (!q || held) return;
    setHeld({ q, guess: g });
    answerQuiz(q, g === q.scripture);
  };

  return (
    <div className="max-w-2xl">
      <p className="font-garamond text-[15px] text-muted-foreground">
        Things people are sure the Bible says. Judge each, then see the verses. A miss comes back soon, a hit later and later.
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {asked} of {QUESTIONS.length} asked{due > 0 ? `, ${due} to look at again` : ""}
      </p>
      {!q ? (
        <p className="mt-8 font-garamond text-lg">Nothing to ask today. The missed ones come back when they are due.</p>
      ) : (
        <div className="mt-6 rounded-lg border border-border/60 p-6">
          <p className="font-garamond text-2xl leading-snug">{q.claim}</p>
          {!held ? (
            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => guess(true)}>In Scripture</Button>
              <Button variant="outline" onClick={() => guess(false)}>Not in Scripture</Button>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <p className={cn("font-garamond text-lg", held.guess === q.scripture ? "text-foreground" : "text-brand")}>
                {held.guess === q.scripture ? "Right." : "Not quite."} {q.scripture ? "It is in Scripture." : "It is not Scripture's."}
              </p>
              <div className="flex items-start gap-3">
                <Badge variant={q.scripture ? "brand" : "secondary"} className={cn("shrink-0", q.origin === "modern" && "border-dashed")}>
                  {TAGS[q.origin ?? "scripture"].label}
                </Badge>
                <p className="font-garamond text-[17px] leading-relaxed">{q.answer}</p>
              </div>
              <div className="space-y-3 border-l border-border pl-4">
                {!t ? (
                  <Spinner />
                ) : (
                  q.refs.map((s) => {
                    const r = studyRef(s);
                    if (!r) return null;
                    return (
                      <blockquote key={s}>
                        <button type="button" onClick={() => read(r, { select: true })} className="text-xs font-semibold text-brand hover:underline">
                          {formatRef(r)}
                        </button>
                        <p className="scripture !text-[16px] !leading-7">{t.range(r).map((v) => v.text).join(" ")}</p>
                      </blockquote>
                    );
                  })
                )}
              </div>
              <Button variant="brand" size="sm" onClick={() => setHeld(null)}>Next</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
