"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

import type { Concept } from "@/lib/prompts/builder";

/**
 * The live concept, shared by every tab.
 *
 * It used to live in `ProductStudio`'s own `useState`, which was correct while
 * the concept had exactly one reader. The preview tab is a second reader of the
 * *same mutable value*: refining "make it more premium" has to repaint the
 * preview, and a copy passed down from the server would keep showing the
 * pre-refinement page until a reload.
 *
 * Context rather than prop-drilling because `ProjectView` receives its panels
 * as `ReactNode` — they are already-constructed elements, so there is no prop
 * path from the page down into them. Turning it into a render-prop component to
 * thread one value through would be more code than this file.
 *
 * Deliberately just `{concept, setConcept}`. Refinement history, in-flight state
 * and the diff stay in `ProductStudio`: nothing else reads them, and moving
 * state up that only one component uses is how a context turns into a store
 * nobody can reason about.
 */

type ConceptStore = {
  concept: Concept | null;
  setConcept: (concept: Concept) => void;
};

const ConceptContext = createContext<ConceptStore | null>(null);

export function ConceptProvider({
  initialConcept,
  children,
}: {
  initialConcept: Concept | null;
  children: ReactNode;
}) {
  const [concept, setConcept] = useState<Concept | null>(initialConcept);
  return (
    <ConceptContext.Provider value={{ concept, setConcept }}>{children}</ConceptContext.Provider>
  );
}

export function useConcept(): ConceptStore {
  const store = useContext(ConceptContext);
  // Throwing beats returning null: a missing provider is a wiring mistake that
  // would otherwise surface as a permanently empty preview tab.
  if (store === null) throw new Error("useConcept must be used inside <ConceptProvider>");
  return store;
}
