"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { FloppyDisk } from "@phosphor-icons/react";

import type { Tone, ContentLanguage } from "@/lib/config/politician";
import { ALL_TONES, ALL_LANGUAGES, TONE_LABELS, LANGUAGE_LABELS } from "@/lib/config/politician";
import type { PoliticianProfileInput } from "@/lib/politician/profile";
import { savePoliticianProfileAction } from "./actions";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/ui/tag-input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProfileWithConstituency {
  name: string;
  publicDesignation: string | null;
  politicalParty: string | null;
  bio: string | null;
  officialWebsite: string | null;
  xHandle: string | null;
  facebookHandle: string | null;
  instagramHandle: string | null;
  preferredTone: Tone;
  preferredLanguages: ContentLanguage[];
  commonPhrases: string[];
  wordsToAvoid: string[];
  hashtagPreferences: string[];
  contentPillars: string[];
  importantProjects: string[];
  publicAchievements: string[];
  officialPositions: string[];
  frequentTopics: string[];
  approvedFacts: string[];
  constituency: {
    name: string;
    state: string | null;
    country: string;
    description: string | null;
    population: number | null;
    keyIssues: string[];
  } | null;
}

function toFormState(profile: ProfileWithConstituency | null): PoliticianProfileInput {
  return {
    name: profile?.name ?? "",
    publicDesignation: profile?.publicDesignation ?? undefined,
    politicalParty: profile?.politicalParty ?? undefined,
    bio: profile?.bio ?? undefined,
    officialWebsite: profile?.officialWebsite ?? undefined,
    xHandle: profile?.xHandle ?? undefined,
    facebookHandle: profile?.facebookHandle ?? undefined,
    instagramHandle: profile?.instagramHandle ?? undefined,
    preferredTone: profile?.preferredTone ?? "INFORMATIONAL",
    preferredLanguages: profile?.preferredLanguages ?? ["ENGLISH"],
    commonPhrases: profile?.commonPhrases ?? [],
    wordsToAvoid: profile?.wordsToAvoid ?? [],
    hashtagPreferences: profile?.hashtagPreferences ?? [],
    contentPillars: profile?.contentPillars ?? [],
    importantProjects: profile?.importantProjects ?? [],
    publicAchievements: profile?.publicAchievements ?? [],
    officialPositions: profile?.officialPositions ?? [],
    frequentTopics: profile?.frequentTopics ?? [],
    approvedFacts: profile?.approvedFacts ?? [],
    constituency: {
      name: profile?.constituency?.name ?? "",
      state: profile?.constituency?.state ?? undefined,
      country: profile?.constituency?.country ?? "India",
      description: profile?.constituency?.description ?? undefined,
      population: profile?.constituency?.population ?? null,
      keyIssues: profile?.constituency?.keyIssues ?? [],
    },
  };
}

export function PoliticianProfileForm({
  organizationId,
  profile,
  readOnly,
}: {
  organizationId: string;
  profile: ProfileWithConstituency | null;
  readOnly: boolean;
}) {
  const [form, setForm] = useState<PoliticianProfileInput>(() => toFormState(profile));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  function set<K extends keyof PoliticianProfileInput>(key: K, value: PoliticianProfileInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setConstituency<K extends keyof PoliticianProfileInput["constituency"]>(
    key: K,
    value: PoliticianProfileInput["constituency"][K],
  ) {
    setForm((prev) => ({ ...prev, constituency: { ...prev.constituency, [key]: value } }));
  }

  function toggleLanguage(lang: ContentLanguage) {
    const has = form.preferredLanguages.includes(lang);
    set(
      "preferredLanguages",
      has
        ? form.preferredLanguages.filter((l) => l !== lang)
        : [...form.preferredLanguages, lang],
    );
  }

  function handleSave() {
    startTransition(async () => {
      const result = await savePoliticianProfileAction(organizationId, form);
      if (result.ok) {
        setFieldErrors({});
        toast.success("Profile saved");
      } else {
        setFieldErrors(result.fieldErrors ?? {});
        toast.error(result.error ?? "Couldn't save — please check the fields.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identity</CardTitle>
          <CardDescription>Who this office represents, publicly.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Name" error={fieldErrors.name}>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              disabled={readOnly}
              placeholder="e.g. Ananya Sharma"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Public designation">
              <Input
                value={form.publicDesignation ?? ""}
                onChange={(e) => set("publicDesignation", e.target.value)}
                disabled={readOnly}
                placeholder="e.g. Member of Legislative Assembly"
              />
            </Field>
            <Field label="Political organization / party">
              <Input
                value={form.politicalParty ?? ""}
                onChange={(e) => set("politicalParty", e.target.value)}
                disabled={readOnly}
              />
            </Field>
          </div>
          <Field label="Bio">
            <Textarea
              value={form.bio ?? ""}
              onChange={(e) => set("bio", e.target.value)}
              disabled={readOnly}
              rows={4}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Official website">
              <Input
                value={form.officialWebsite ?? ""}
                onChange={(e) => set("officialWebsite", e.target.value)}
                disabled={readOnly}
                placeholder="https://"
              />
            </Field>
            <Field label="X (Twitter) handle">
              <Input
                value={form.xHandle ?? ""}
                onChange={(e) => set("xHandle", e.target.value)}
                disabled={readOnly}
                placeholder="@handle"
              />
            </Field>
            <Field label="Facebook handle">
              <Input
                value={form.facebookHandle ?? ""}
                onChange={(e) => set("facebookHandle", e.target.value)}
                disabled={readOnly}
              />
            </Field>
            <Field label="Instagram handle">
              <Input
                value={form.instagramHandle ?? ""}
                onChange={(e) => set("instagramHandle", e.target.value)}
                disabled={readOnly}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Constituency</CardTitle>
          <CardDescription>The district or area represented.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Name" className="sm:col-span-2">
              <Input
                value={form.constituency.name}
                onChange={(e) => setConstituency("name", e.target.value)}
                disabled={readOnly}
                placeholder="e.g. South Delhi"
              />
            </Field>
            <Field label="Population">
              <Input
                type="number"
                value={form.constituency.population ?? ""}
                onChange={(e) =>
                  setConstituency(
                    "population",
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
                disabled={readOnly}
              />
            </Field>
            <Field label="State">
              <Input
                value={form.constituency.state ?? ""}
                onChange={(e) => setConstituency("state", e.target.value)}
                disabled={readOnly}
              />
            </Field>
            <Field label="Country">
              <Input
                value={form.constituency.country}
                onChange={(e) => setConstituency("country", e.target.value)}
                disabled={readOnly}
              />
            </Field>
          </div>
          <Field label="Description">
            <Textarea
              value={form.constituency.description ?? ""}
              onChange={(e) => setConstituency("description", e.target.value)}
              disabled={readOnly}
              rows={3}
            />
          </Field>
          <Field label="Key local issues">
            <TagInput
              value={form.constituency.keyIssues}
              onChange={(v) => setConstituency("keyIssues", v)}
              placeholder="Add and press Enter"
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Voice & style</CardTitle>
          <CardDescription>
            How the AI content agent should sound by default.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Default tone">
              <Select
                value={form.preferredTone}
                onValueChange={(v) => set("preferredTone", v as Tone)}
                disabled={readOnly}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_TONES.map((tone) => (
                    <SelectItem key={tone} value={tone}>
                      {TONE_LABELS[tone]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Languages">
              <div className="flex h-9 items-center gap-4">
                {ALL_LANGUAGES.map((lang) => (
                  <label key={lang} className="flex items-center gap-1.5 text-sm">
                    <Checkbox
                      checked={form.preferredLanguages.includes(lang)}
                      onCheckedChange={() => toggleLanguage(lang)}
                      disabled={readOnly}
                    />
                    {LANGUAGE_LABELS[lang]}
                  </label>
                ))}
              </div>
            </Field>
          </div>
          <Field label="Common phrases">
            <TagInput
              value={form.commonPhrases}
              onChange={(v) => set("commonPhrases", v)}
              placeholder="Phrases this office likes to use"
            />
          </Field>
          <Field label="Words to avoid">
            <TagInput
              value={form.wordsToAvoid}
              onChange={(v) => set("wordsToAvoid", v)}
              placeholder="Words that should never appear in drafts"
            />
          </Field>
          <Field label="Hashtag preferences">
            <TagInput
              value={form.hashtagPreferences}
              onChange={(v) => set("hashtagPreferences", v)}
              placeholder="#example"
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Content context</CardTitle>
          <CardDescription>
            What content generation and the content radar should know about.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field label="Content pillars">
            <TagInput
              value={form.contentPillars}
              onChange={(v) => set("contentPillars", v)}
              placeholder="e.g. Infrastructure, Education"
            />
          </Field>
          <Field label="Frequently discussed topics">
            <TagInput
              value={form.frequentTopics}
              onChange={(v) => set("frequentTopics", v)}
            />
          </Field>
          <Field label="Important projects">
            <TagInput
              value={form.importantProjects}
              onChange={(v) => set("importantProjects", v)}
            />
          </Field>
          <Field label="Public achievements">
            <TagInput
              value={form.publicAchievements}
              onChange={(v) => set("publicAchievements", v)}
            />
          </Field>
          <Field label="Official positions held">
            <TagInput
              value={form.officialPositions}
              onChange={(v) => set("officialPositions", v)}
            />
          </Field>
          <Field
            label="Approved facts"
            hint="Short, user-attested facts the AI can cite as verified — distinct from AI-inferred claims."
          >
            <TagInput
              value={form.approvedFacts}
              onChange={(v) => set("approvedFacts", v)}
            />
          </Field>
        </CardContent>
      </Card>

      {!readOnly ? (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={pending}>
            <FloppyDisk weight="fill" className="size-4" />
            {pending ? "Saving…" : "Save profile"}
          </Button>
        </div>
      ) : (
        <p className="text-right text-xs text-muted-foreground">
          Ask an Admin or Super Admin to make changes here.
        </p>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
