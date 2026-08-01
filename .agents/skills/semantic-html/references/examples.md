# Worked Examples

Before/after markup for each rule section in `SKILL.md`. Loaded on demand — read this file when a finding needs a concrete corrected snippet. Each pair shows the violation first, then the accessible form.

## A. Core Principles

`div` soup with behaviour baked into markup:

```html
<!-- before -->
<div class="card" onclick="open()" style="padding:1rem">
    <div class="title">Weekly report</div>
    <div class="link" onclick="location='/r/1'">Open</div>
</div>
```

```html
<!-- after -->
<article class="card">
    <h3>Weekly report</h3>
    <a href="/r/1">Open the weekly report</a>
</article>
```

## B. Document Structure

Heading levels chosen for size, landmarks missing:

```html
<!-- before -->
<div class="topbar">…</div>
<h1>Dashboard</h1>
<h4>Recent activity</h4>   <!-- jumped h1 → h4 for smaller text -->
<div class="content">…</div>
```

```html
<!-- after -->
<html lang="en">
…
<header>…</header>
<main>
    <h1>Dashboard</h1>
    <section>
        <h2>Recent activity</h2>
        …
    </section>
</main>
```

## C. Content Semantics

Repeating cards forced into a list where membership means nothing, and a hand-built toggle:

```html
<!-- before -->
<ul class="cards">
    <li>
        <div class="post"><b>Title</b>
            <p>…</p></div>
    </li>
</ul>
<div class="accordion" onclick="toggle()">Details ▾</div>
<div class="panel" hidden>…</div>
```

```html
<!-- after -->
<ul class="cards">
    <li>
        <article>
            <h3>Title</h3>
            <p>…</p>
        </article>
    </li>
</ul>
<details>
    <summary>Details</summary>
    <p>…</p>
</details>
```

## D. Images & Icons

Decorative image described, informative image empty, icon-only button unnamed:

```html
<!-- before -->
<img src="divider.png" alt="decorative swirl divider"/>
<img src="chart.png" alt=""/>
<button>
    <svg>…</svg>
</button>
```

```html
<!-- after -->
<img src="divider.png" alt=""/>
<img src="chart.png" alt="Revenue rose 40% from Q1 to Q2"/>
<button aria-label="Delete row">
    <svg aria-hidden="true">…</svg>
</button>
```

Meaningful inline SVG:

```html

<svg role="img" aria-hidden="false">
    <title>Verified account</title>
    …
</svg>
```

## E. Tables

Layout table and header-less data:

```html
<!-- before -->
<table>
    <tr>
        <td>Region</td>
        <td>Q1</td>
        <td>Q2</td>
    </tr>
    <tr>
        <td>North</td>
        <td>10</td>
        <td>14</td>
    </tr>
</table>
```

```html
<!-- after -->
<table>
    <caption>Sales by region (units, thousands)</caption>
    <thead>
    <tr>
        <th scope="col">Region</th>
        <th scope="col">Q1</th>
        <th scope="col">Q2</th>
    </tr>
    </thead>
    <tbody>
    <tr>
        <th scope="row">North</th>
        <td>10</td>
        <td>14</td>
    </tr>
    </tbody>
</table>
```

## F. Links

Non-descriptive text, silent new-tab, no skip link:

```html
<!-- before -->
<a href="/report.pdf">click here</a>
<a href="https://x.example" target="_blank">details</a>
```

```html
<!-- after -->
<a href="#main" class="skip-link">Skip to main content</a>
…
<a href="/report.pdf">Download the annual report (PDF)</a>
<a href="https://x.example" target="_blank" rel="noopener">
    Read the details<span class="visually-hidden"> (opens in a new tab)</span>
</a>
```

## G. Interactive Elements & Forms

Fake button, placeholder-as-label, wrong input type, unassociated error:

```html
<!-- before -->
<div class="btn" onclick="save()">Save</div>
<form>
    <input placeholder="Email"/>
    <button>Delete</button>          <!-- default type=submit -->
    <span class="error">Email is invalid</span>
</form>
```

```html
<!-- after -->
<button type="button" onclick="save()">Save</button>
<form>
    <label for="email">Email</label>
    <input id="email" type="email" autocomplete="email" required
           aria-describedby="email-err" aria-invalid="true"/>
    <p id="email-err" class="error">Enter a valid email address.</p>
    <button type="submit">Save</button>
    <button type="button">Delete</button>
</form>
```

Grouped controls:

```html

<fieldset>
    <legend>Notify me by</legend>
    <label><input type="radio" name="notify" value="email"/> Email</label>
    <label><input type="radio" name="notify" value="sms"/> SMS</label>
</fieldset>
```

## H. Focus & Keyboard

Positive `tabindex`, hand-rolled modal that loses focus:

```html
<!-- before -->
<span tabindex="3" onclick="open()">Open</span>
<div class="modal" hidden>…</div>
```

```html
<!-- after -->
<button onclick="dialog.showModal()">Open</button>
<dialog id="dialog" aria-modal="true" aria-labelledby="dlg-title">
    <h2 id="dlg-title">Confirm</h2>
    …
    <button onclick="dialog.close()">Close</button>
</dialog>
```

Native `<dialog>` with `.showModal()` moves focus in, contains it, and restores it to the trigger on close.

## I. ARIA

Redundant ARIA, role duplication, disclosure without state:

```html
<!-- before -->
<button role="button" aria-label="Submit button">Submit</button>
<button onclick="toggle()">Filters</button>
<div id="filters" hidden>…</div>
```

```html
<!-- after -->
<button>Submit</button>
<button aria-expanded="false" aria-controls="filters" onclick="toggle(this)">Filters</button>
<div id="filters" hidden>…</div>
```

Announcing an async result to screen readers:

```html
<p role="status">Draft saved.</p>
```
