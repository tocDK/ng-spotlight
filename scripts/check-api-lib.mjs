/**
 * Public API extraction for check-api.mjs: reads a bundled .d.ts with the TypeScript compiler and
 * prints every export with its public and protected members (private members and Angular's
 * generated ɵfac/ɵprov fields are left out; ɵcmp/ɵdir become the selector, inputs and outputs).
 * The output is plain text, so an API change shows up as a reviewable diff.
 */
import ts from 'typescript';

let namespaces = new Map();
/** One line, with namespace imports spelled `import('module').X` so a bundler's alias names don't show up as API changes. */
const flat = (text) => {
  let out = text.replace(/\s+/g, ' ').replace(/\( /g, '(').replace(/ \)/g, ')').trim();
  for (const [alias, module] of namespaces) out = out.replace(new RegExp(`\\b${alias}\\.`, 'g'), `import('${module}').`);
  return out;
};
const stripDeclare = (text) => text.replace(/^(export )?(declare )?/, '');
const has = (node, kind) => (ts.getModifiers?.(node) ?? []).some((m) => m.kind === kind);

function angularMeta(member) {
  const type = member.type;
  if (!type || !ts.isTypeReferenceNode(type) || !type.typeArguments) return null;
  const [, selector, exportAs, inputs, outputs] = type.typeArguments.map((t) => flat(t.getText()));
  const kind = member.name.getText() === 'ɵcmp' ? 'component' : 'directive';
  return `  // @${kind} selector=${selector} exportAs=${exportAs} inputs=${inputs} outputs=${outputs}`;
}

function renderMembers(members) {
  const lines = [];
  for (const member of members) {
    if (has(member, ts.SyntaxKind.PrivateKeyword)) continue;
    if (member.name && ts.isPrivateIdentifier(member.name)) continue;
    const name = member.name?.getText() ?? '';
    if (name.startsWith('ɵ')) {
      if (name === 'ɵcmp' || name === 'ɵdir') {
        const meta = angularMeta(member);
        if (meta) lines.push(meta);
      }
      continue;
    }
    lines.push(`  ${flat(member.getText())}`);
  }
  return lines;
}

function heading(decl, keyword) {
  const typeParams = decl.typeParameters ? `<${decl.typeParameters.map((p) => flat(p.getText())).join(', ')}>` : '';
  const clauses = (decl.heritageClauses ?? []).map((c) => ` ${flat(c.getText())}`).join('');
  return `${keyword} ${decl.name.getText()}${typeParams}${clauses}`;
}

function render(exportName, decl) {
  const alias = (local) => (local !== exportName ? ` /* exported as ${exportName} */` : '');
  if (ts.isClassDeclaration(decl)) {
    const abstract = has(decl, ts.SyntaxKind.AbstractKeyword) ? 'abstract ' : '';
    return [`${abstract}${heading(decl, 'class')} {${alias(decl.name.getText())}`, ...renderMembers(decl.members), '}'];
  }
  if (ts.isInterfaceDeclaration(decl)) {
    return [`${heading(decl, 'interface')} {${alias(decl.name.getText())}`, ...renderMembers(decl.members), '}'];
  }
  if (ts.isVariableDeclaration(decl)) {
    const keyword = decl.parent.flags & ts.NodeFlags.Const ? 'const' : 'let';
    return [`${keyword} ${flat(decl.getText())};${alias(decl.name.getText())}`];
  }
  const local = decl.name?.getText() ?? exportName;
  return [`${stripDeclare(flat(decl.getText()))}${alias(local)}`];
}

/**
 * @param {string} dtsPath bundled declaration file of one entry point
 * @param {Record<string, string[]>} [paths] module paths (e.g. the primary entry for a secondary one)
 * @returns {{ lines: string[], internal: string[] }} the rendered API, and the non-exported
 *   declarations the bundle had to include because the public API references them
 */
export function extractApi(dtsPath, paths = {}) {
  const program = ts.createProgram([dtsPath], {
    noEmit: true,
    skipLibCheck: true,
    strict: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    types: [],
    paths,
  });
  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(dtsPath);
  if (!sourceFile) throw new Error(`cannot read ${dtsPath}`);
  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
  if (!moduleSymbol) throw new Error(`${dtsPath} is not a module`);
  namespaces = new Map();
  for (const statement of sourceFile.statements) {
    const bindings = ts.isImportDeclaration(statement) ? statement.importClause?.namedBindings : undefined;
    if (bindings && ts.isNamespaceImport(bindings)) namespaces.set(bindings.name.text, statement.moduleSpecifier.text);
  }

  const exported = new Set();
  const lines = [];
  const exportsOf = checker.getExportsOfModule(moduleSymbol).sort((a, b) => a.name.localeCompare(b.name));
  for (const symbol of exportsOf) {
    const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
    for (const decl of target.declarations ?? []) {
      exported.add(decl);
      if (decl.getSourceFile() !== sourceFile) {
        lines.push(`/* ${symbol.name}: re-exported from another module */`);
        continue;
      }
      lines.push(...render(symbol.name, decl), '');
    }
  }

  const internal = [];
  for (const statement of sourceFile.statements) {
    const decls = ts.isVariableStatement(statement) ? statement.declarationList.declarations : [statement];
    for (const decl of decls) {
      if (!decl.name || exported.has(decl) || ts.isImportDeclaration(decl) || ts.isExportDeclaration(decl)) continue;
      internal.push(decl.name.getText());
    }
  }
  return { lines, internal: internal.sort() };
}

/** The committed snapshot text for one entry point. */
export function formatApi(packageName, entry, { lines, internal }) {
  const name = entry === '.' ? packageName : `${packageName}/${entry.replace(/^\.\//, '')}`;
  return [
    `# Public API: ${name}`,
    '',
    'Generated by `npm run check:api -- --update` from the built `.d.ts`. Do not edit by hand: an API change',
    'must show up here as a reviewed diff.',
    '',
    '```ts',
    ...lines,
    '```',
    '',
    '## Non-exported declarations the public API references',
    '',
    internal.length === 0 ? '(none)' : internal.map((n) => `- \`${n}\``).join('\n'),
    '',
  ].join('\n');
}

/** Lines only in `expected` (-) and only in `actual` (+), in order. */
export function diffLines(expected, actual) {
  const a = expected.split('\n');
  const b = actual.split('\n');
  const inB = new Set(b);
  const inA = new Set(a);
  return [...a.filter((l) => !inB.has(l)).map((l) => `- ${l}`), ...b.filter((l) => !inA.has(l)).map((l) => `+ ${l}`)];
}
