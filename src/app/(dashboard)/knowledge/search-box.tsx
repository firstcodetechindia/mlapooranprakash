"use client";

import { useState, useTransition } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";

import { searchKnowledgeAction } from "./actions";
import type { KnowledgeSearchResult } from "@/lib/knowledge/search";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function SearchBox({ organizationId }: { organizationId: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KnowledgeSearchResult[] | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSearch() {
    if (!query.trim()) return;
    startTransition(async () => {
      const found = await searchKnowledgeAction(organizationId, query);
      setResults(found);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Search knowledge base</CardTitle>
        <CardDescription>
          Retrieval demo — this is what content generation will draw on
          later.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="e.g. road infrastructure achievements"
          />
          <Button onClick={handleSearch} disabled={pending}>
            <MagnifyingGlass className="size-4" />
            Search
          </Button>
        </div>

        {results !== null ? (
          results.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No results — upload and approve a document first.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {results.map((result) => (
                <div key={result.chunkId} className="rounded-lg border border-border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{result.documentTitle}</p>
                    <Badge variant="outline">{(result.score * 100).toFixed(0)}% match</Badge>
                  </div>
                  <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                    {result.content}
                  </p>
                </div>
              ))}
            </div>
          )
        ) : null}
      </CardContent>
    </Card>
  );
}
