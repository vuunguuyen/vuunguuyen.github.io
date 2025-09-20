# Copilot Instructions for AI Coding Agents

## Project Overview
This repository is a static personal or portfolio website, primarily using HTML and CSS. The main entry point is `index.html`, with styles organized under the `CSS/` directory and images in `img/`.

## Key Structure
- `index.html`: Main HTML file, contains the website's structure and content.
- `CSS/styles.css`, `CSS/webstyles.css`: Core stylesheets. `styles.css` is typically for base/global styles, while `webstyles.css` may contain page-specific or additional styles.
- `img/`: Contains all image assets used in the site.

## Development Workflow
- No build system or JavaScript is present; changes to HTML or CSS are reflected immediately in the browser.
- To preview changes, open `index.html` directly in a web browser.
- There are no automated tests or deployment scripts in this repository.

## Conventions & Patterns
- Use semantic HTML5 elements for structure (e.g., `<header>`, `<main>`, `<footer>`).
- Keep CSS organized: place base styles in `styles.css`, and use `webstyles.css` for overrides or page-specific rules.
- Reference images using relative paths from the HTML or CSS (e.g., `img/filename.png`).
- Maintain consistent indentation (2 spaces) and use lowercase for filenames and class names.

## Extending the Project
- To add new pages, create additional HTML files in the root and link them from `index.html`.
- Add new stylesheets to the `CSS/` directory as needed, and link them in the HTML `<head>`.
- Place new images in the `img/` directory.

## Example Patterns
- Linking a stylesheet:
  ```html
  <link rel="stylesheet" href="CSS/styles.css">
  ```
- Adding an image:
  ```html
  <img src="img/example.png" alt="Description">
  ```

## Integration Points
- No external dependencies or frameworks are used by default.
- If adding JavaScript or third-party libraries, place scripts in a new `js/` directory and update instructions accordingly.

---

For major changes or new conventions, update this file to keep AI agents and developers aligned.
