# PJ Antique — Website

**Petrified Wood Bali | antique.id**

A premium display website for the PJ Antique showroom in Ubud, Bali. Built under CV Karya Bersama / Petrified Wood Indonesia.

---

## Pages

| Page | File | Description |
|------|------|-------------|
| Home | `index.html` | Hero, categories, featured products, brand story |
| Collections | `collections.html` | Full filterable product catalog |
| Product Detail | `product.html` | Individual product page (dynamic, URL param `?id=`) |
| About | `about.html` | Brand story, craft, showroom info |
| Contact | `contact.html` | Showroom address, map, enquiry form |

---

## How to Add / Edit / Remove Products

All product data lives in one file: **`data/products.json`**

### Add a Product
Copy an existing product entry and change the fields:
```json
{
  "id": "LR-005",
  "name": "Your Product Name",
  "category": "living-room",
  "shortDesc": "Short one-line description for cards.",
  "description": "Full description paragraph shown on the product detail page.",
  "material": "Petrified Wood, Iron Legs",
  "dimensions": "W 120 cm × D 70 cm × H 40 cm",
  "weight": "Approx. 80 kg",
  "finish": "Natural Polish",
  "featured": false,
  "images": ["images/your-product-photo.png"]
}
```

**Category IDs:**
- `living-room`
- `bedroom`
- `dining-room`
- `outdoor`
- `decoration`

**`featured: true`** → appears on the homepage carousel.

### Remove a Product
Delete the product's `{}` block from the `products` array in `data/products.json`.

### Edit a Product
Find the product by its `"id"` and update any field.

---

## How to Add / Edit Categories

Categories are defined in `data/products.json` under `"categories"`:
```json
{ "id": "new-category", "label": "New Category", "icon": "star" }
```
Then add a filter button in `collections.html` and a category card in `index.html`.

---

## Adding Product Images

1. Place your image file in the `images/` folder
2. Reference it in `products.json` under `"images": ["images/your-file.jpg"]`
3. Multiple images supported — the first is the main display image

**Recommended image size:** 800×1000px (4:5 ratio) for product cards.

---

## Deployment

This is a plain static website — no build step required.

### Option 1: Open Locally
Double-click `index.html` — works in any browser.
> Note: `fetch()` for products.json requires a local server. Use VS Code Live Server, or:
```bash
npx serve .
```

### Option 2: Deploy to Netlify (Free)
1. Drag the entire `pj-antique-website` folder to [netlify.com/drop](https://netlify.com/drop)
2. Point your `antique.id` domain to the Netlify URL

### Option 3: Deploy to Vercel (Free)
```bash
npx vercel .
```

---

## Contact Form

The contact form currently simulates submission (shows success message).

To make it live, sign up at [formspree.io](https://formspree.io), create a form for `info@antique.id`, and update the `action` attribute in `contact.html`:
```html
<form action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
```

---

## Logo

Replace the text wordmark with your logo image by updating the `.nav__logo` section in each HTML file:
```html
<a href="index.html" class="nav__logo">
  <img src="images/logo.png" alt="PJ Antique" height="40">
</a>
```

---

*Built for CV Karya Bersama / Petrified Wood Indonesia*
