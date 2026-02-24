const SKILL_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: "JavaScript", pattern: /\bjavascript\b/i },
  { name: "TypeScript", pattern: /\btypescript\b/i },
  { name: "Python", pattern: /\bpython\b/i },
  { name: "Java", pattern: /\bjava\b/i },
  { name: "C#", pattern: /\bc\s*#\b|\bcsharp\b/i },
  { name: "C++", pattern: /\bc\+\+\b/i },
  { name: "Go", pattern: /\bgo(lang)?\b/i },
  { name: "Rust", pattern: /\brust\b/i },
  { name: "Node.js", pattern: /\bnode(\.js)?\b/i },
  { name: "React", pattern: /\breact(\.js)?\b/i },
  { name: "Next.js", pattern: /\bnext(\.js)?\b/i },
  { name: "Vue.js", pattern: /\bvue(\.js)?\b/i },
  { name: "Angular", pattern: /\bangular\b/i },
  { name: "HTML", pattern: /\bhtml5?\b/i },
  { name: "CSS", pattern: /\bcss3?\b/i },
  { name: "Tailwind CSS", pattern: /\btailwind\b/i },
  { name: "SQL", pattern: /\bsql\b/i },
  { name: "PostgreSQL", pattern: /\bpostgres(ql)?\b/i },
  { name: "MySQL", pattern: /\bmysql\b/i },
  { name: "SQLite", pattern: /\bsqlite\b/i },
  { name: "MongoDB", pattern: /\bmongodb\b/i },
  { name: "Redis", pattern: /\bredis\b/i },
  { name: "Prisma", pattern: /\bprisma\b/i },
  { name: "GraphQL", pattern: /\bgraphql\b/i },
  { name: "REST APIs", pattern: /\brest(ful)?\b/i },
  { name: "Git", pattern: /\bgit\b/i },
  { name: "GitHub", pattern: /\bgithub\b/i },
  { name: "Docker", pattern: /\bdocker\b/i },
  { name: "Kubernetes", pattern: /\bkubernetes|\bk8s\b/i },
  { name: "AWS", pattern: /\baws\b|\bamazon web services\b/i },
  { name: "Azure", pattern: /\bazure\b/i },
  { name: "GCP", pattern: /\bgcp\b|\bgoogle cloud\b/i },
  { name: "CI/CD", pattern: /\bci\/?cd\b|\bcontinuous integration\b/i },
  { name: "Jest", pattern: /\bjest\b/i },
  { name: "Playwright", pattern: /\bplaywright\b/i },
  { name: "Cypress", pattern: /\bcypress\b/i },
];

export function extractSkillCandidatesFromResumeText(text: string, maxSkills = 40): string[] {
  const normalized = text.slice(0, 100000);
  const found: string[] = [];

  for (const skill of SKILL_PATTERNS) {
    if (skill.pattern.test(normalized)) {
      found.push(skill.name);
    }

    if (found.length >= maxSkills) {
      break;
    }
  }

  return Array.from(new Set(found));
}
