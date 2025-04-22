## Global Rules (`[*]`)

These rules apply to all files unless overridden by specific file type settings.

* **Folder naming:** Folder should be named using lowerCamelCase
* **File naming:** Files should follow lowerCamelCase
* **Character Set:** Files must use the `UTF-8` character encoding with a Byte Order Mark (BOM).
* **Line Endings:** Use Windows-style line endings (`CRLF`).
* **Indentation Size:** Each indentation level consists of 4 spaces.
* **Indentation Style:** Use spaces for indentation, not tabs.
* **Final Newline:** Insert a blank line at the end of the file.
* **Maximum Line Length:** Lines should not exceed 120 characters.
* **Tab Width:** A tab character should visually represent 4 spaces (relevant if tabs were used).
* **Continuation Indent:** Lines that wrap from a previous line should be indented by an additional 8 spaces relative to the start of the original line.
* **Blank Lines:** Use blank lines judiciously to separate logical blocks of code (e.g., between functions, distinct stages within a function, or related groups of statements) to improve readability, similar to paragraphs in text. Follow specific rules for blank lines defined for each file type where applicable.
* **Comments:** Avoid comments as much as possible; comments are reserved for explaining *why*, never *what*.
* **Update Comments:** Comments explaining changes in the file are forbidden (this is not optional). Use version control commit messages for this purpose.

## CSS Files (`*.css`)

These rules apply specifically to CSS files.

* **Brace Placement:** Place the opening brace (`{`) on the *next line* after the selector.
* **Closing Brace Alignment:** Do not align the closing brace (`}`) vertically with the properties inside the block.
* **Blank Lines:**
    * Insert 1 blank line around nested selectors.
    * Insert 1 blank line between rule blocks.
    * Max of 2 consecutive blank lines within code blocks.
* **Quotes:**
    * Enforce the use of quotes where applicable (e.g., attribute selectors) during formatting.
    * Use double quotes (`"`) for quoted values.
* **Spacing:**
    * Add a space after the colon (`:`) in property declarations.
    * Add a space before the opening brace (`{`) of a rule block.
    * Do not add a space at the beginning of block comments (`/* ... */`).
* **Single-Line Blocks:** Expand blocks that could fit on a single line into multiple lines.
* **Property Order:** CSS properties must be sorted according to a specific predefined order (font, position, box-model, text, appearance, animation, misc - see the long list in the config).
* **Value Alignment:** Do not vertically align property values across different lines within a block.

## TypeScript Files (`*.ats`, `*.cts`, `*.mts`, `*.ts`. '.tsx')

These rules apply specifically to TypeScript files.

### Naming Conventions

* **`UpperCamelCase`**: Use for:
    * Class names
    * Interface names
    * Type aliases
    * Enum names
    * Decorators
    * Type parameters
    * Component functions in TSX/JSX
    * `JSXElement` type parameter
* **`lowerCamelCase`**: Use for:
    * Variables
    * Parameters
    * Functions
    * Methods
    * Properties
    * Module aliases
* **`CONSTANT_CASE`**: Use for:
    * Global constant values
    * Enum values
* **Private Identifiers (`#ident`)**: Never used. Prefer TypeScript's `private` keyword.
* **Underscores**: Do not use trailing or leading underscores for private properties or methods. Use the `private` keyword.
* **Descriptiveness**: Names must be descriptive and clear to a new reader.
* **Dollar Sign (`$`)**: Identifiers should not generally use `$`, except when required by naming conventions for third-party frameworks (e.g., Observables often end with `$`).

### Coding Style

* **Variable declaration:** Use `const` as often as possible. Only use `let` for variables that need to be modified after initialization.
* **Use `readonly`:** Class properties that are not reassigned outside of the constructor should be marked as `readonly`.
* **Explicit Types:** Always explicitly define types for variables, parameters, and function return values.
* **Interfaces vs Types:** Prefer interfaces (`interface Foo {}`) over type literal aliases (`type Foo = {}`) for defining object shapes.
* **Array Types:** Use the shorthand syntax sugar for arrays (`T[]` or `readonly T[]`) rather than the longer form (`Array<T>` or `ReadonlyArray<T>`).
* **Function** Function should be simple and do a single thing
* **Function Size** Avoid big functions. Function should not have more than 80 lines of code.

### Formatting Rules

* **Continuation Indent:** Use **4 spaces** for continuation indentation (overrides the global setting of 8).
* **Braces:**
    * Place opening braces (`{`) on the *next line* for blocks, classes, functions (including expressions), and methods.
    * Do *not* force braces for single-statement `do-while`, `for`, `if`, or `while` structures.
* **Newlines:**
    * Place `else` on a *new line* after the preceding `}`.
    * Place `catch`, `finally`, and the `while` of a `do-while` loop on the *same line* as the preceding `}`.
    * Do not force extra newlines inside parentheses/brackets for arrays, calls, `for` statements, method parameters, or parenthesized expressions.
* **Blank Lines:**
    * Keep 2 blank lines after the import section.
    * Keep 1 blank line around classes, functions, and methods (including interface methods).
    * Keep 0 blank lines around fields (in classes or interfaces).
    * Preserve max of 2 consecutive blank lines within code.
* **Spaces:**
    * **Around Operators:** Add spaces around additive (`+`, `-`), arrow (`=>`), assignment (`=`, `+=`, etc.), bitwise (`&`, `|`), equality (`==`, `===`), logical (`&&`, `||`), multiplicative (`*`, `/`), and relational (`<`, `>`) operators. Do not add spaces around unary operators (like `!`, `++`, `--`) unless specified otherwise (`!`: `ij_typescript_space_after_unary_not = false`, `ij_typescript_space_before_unary_not = false`).
    * **After Keywords/Symbols:** Add a space after commas (`,`), colons (`:`) in type annotations, colons (`:`) in object properties, question marks (`?`) in ternary or optional types, and the `*` in generator functions (`function*`).
    * **Before Keywords/Symbols:** Add a space before the opening brace (`{`) of blocks (class, function, method, `if`, `else`, `for`, `while`, `try`, `catch`, `finally`, `switch`, `do`). Add a space before the parentheses (`(`) of control flow statements (`catch`, `for`, `if`, `switch`, `while`). Add a space before keywords like `catch`, `else`, `finally`, `while` (in `do-while`). Add a space before the colon (`:`) in type annotations and question marks (`?`) in ternary/optional types.
    * **No Space Before:** Do not add a space before commas (`,`), semicolons in `for` loops, parentheses in method calls or declarations, or the colon in object properties.
    * **Inside:** Add spaces within object type braces (`{ key: type }`) and around the pipe in union types (`string | number`). Do not add spaces within array brackets (`[]`), parentheses (`()`) for calls/declarations/control flow, import braces (`{}`), interpolation braces (`${}`), object literal braces (`{}`), regular brackets, or type assertion angle brackets (`<>`).
* **Imports:**
    * Sort named imports alphabetically (`import { a, b } from ...`).
    * Do not sort module specifiers (`import ... from 'b'; import ... from 'a';`).
    * Merge members from the same module into one statement where possible (`global` setting).
    * Prefer absolute paths based on module resolution (`global` setting).
    * Use Node.js module resolution strategy.
    * Always use path mappings from `tsconfig.json` if available.
    * Avoid importing directly from: `rxjs/Rx`, `node_modules/**`, `**/node_modules/**`, `@angular/material`, `@angular/material/typings/**`.
* **Quotes and Semicolons:**
    * Use double quotes (`"`) for strings.
    * Terminate statements with semicolons (`;`).
    * Do not automatically change existing valid quote styles or optional semicolons unless reformatting the specific line/block.
    * Keep existing trailing commas; do not add or remove them automatically.
* **Types & Modifiers:**
    * Prefer angle bracket syntax (`<Type>value`) for type assertions over `value as Type`.
    * Do not automatically add the `public` modifier to class members.
* **Comments:**
    * Add a space after the start of line comments (`// `).
    * Keep block comments (`/* ... */`) and line comments (`//`) starting at the first column if they are already there.
* **Miscellaneous:**
    * Indent `case` statements relative to the `switch` statement.
    * Indent chained calls relative to the receiver.
    * Format `else if` constructs compactly without extra indentation.

## HTML Files (`*.htm`, `*.html`, `*.sht`, `*.shtm`, `*.shtml`)

These rules apply specifically to HTML (and related) files.

* **Indentation Size:** Use **2 spaces** for indentation (overrides the global setting of 4).
* **Tab Width:** Visual tab width is 2 spaces.
* **Continuation Indent:** Use 4 spaces for continuation indentation.
* **Attribute Formatting:**
    * Align attributes vertically when they wrap to multiple lines.
    * Do not force a newline before the first attribute or after the last attribute.
    * Use double quotes (`"`) for attribute values.
    * Do not enforce quotes on attributes that don't strictly require them (e.g., boolean attributes).
    * Do not put spaces around the equals sign (`=`) in attributes.
* **Tag Formatting:**
    * Add a new line before `<body>`, `<div>`, `<p>`, `<form>`, `<h1>`, `<h2>`, and `<h3>` tags.
    * Do *not* add a newline before `<br>` tags (attempt to remove if present).
    * Do not indent the direct children of `<html>`, `<body>`, `<thead>`, `<tbody>`, and `<tfoot>`.
    * Do not add a space after the tag name (e.g., `<p >` vs `<p>`).
    * Do not add a space inside self-closing tags (e.g., `<br />` vs `<br/>`).
* **Whitespace and Line Breaks:**
    * Dont allow more than 2 blank lines.
    * Do not preserve arbitrary whitespace between tags *except* inside `<span`, `<pre>`, and `<textarea>` tags.
* **Inline vs Block Elements:**
    * A predefined list identifies common inline tags (e.g., `<a>`, `<span>`, `<img>`).
    * Do not break formatting inside specific inline tags like `<title>`, `<h1>`-`<h6>`, `<p>`.
* **Text Formatting:**
    * Do not align text content within tags.
    * Wrap text content if it exceeds line length.
* **Comments:**
    * Keep block comments (``) and line comments starting at the first column if they are already there.
    * Do not add extra spaces inside block comments.
