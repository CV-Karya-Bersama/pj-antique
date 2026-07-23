<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="2.0" 
                xmlns:html="http://www.w3.org/TR/REC-html40"
                xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
                xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9"
                xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <title>XML Sitemap — Putra Jambu Antique</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400&amp;family=DM+Sans:wght@400;500&amp;display=swap" rel="stylesheet" />
        <style type="text/css">
          body { font-family: 'DM Sans', -apple-system, system-ui, sans-serif; color: #35302E; margin: 0; background: #FAF8F5; }
          .header { background: #35302E; padding: 2.5rem 5%; color: #FAF8F5; }
          .header h1 { font-family: 'Cormorant Garamond', serif; font-weight: 400; font-size: 2.5rem; margin: 0; }
          .header p { margin: 0.5rem 0 0 0; color: #a49e9c; }
          .container { padding: 3rem 5%; max-width: 1400px; margin: 0 auto; }
          table { width: 100%; border-collapse: collapse; background: #fff; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
          th, td { padding: 1rem 1.5rem; text-align: left; border-bottom: 1px solid #e2ddd8; }
          th { background: #f2ece6; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.1em; color: #6a6361; }
          td { font-size: 0.95rem; }
          a { color: #35302E; text-decoration: none; border-bottom: 1px solid rgba(53,48,46,0.3); transition: border-color 0.2s; }
          a:hover { border-bottom-color: #35302E; }
          tr:hover { background-color: #fdfcfb; }
          .count { margin-top: 0; margin-bottom: 1.5rem; color: #6a6361; font-size: 0.95rem; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>XML Sitemap</h1>
          <p>This is a generated XML Sitemap for Putra Jambu Antique, meant for consumption by search engines.</p>
        </div>
        <div class="container">
          <p class="count"><strong><xsl:value-of select="count(sitemap:urlset/sitemap:url)"/></strong> URLs found in this sitemap.</p>
          <table>
            <thead>
              <tr>
                <th>URL</th>
                <th>Priority</th>
                <th>Change Frequency</th>
              </tr>
            </thead>
            <tbody>
              <xsl:for-each select="sitemap:urlset/sitemap:url">
                <tr>
                  <td><a href="{sitemap:loc}"><xsl:value-of select="sitemap:loc"/></a></td>
                  <td><xsl:value-of select="sitemap:priority"/></td>
                  <td><xsl:value-of select="sitemap:changefreq"/></td>
                </tr>
              </xsl:for-each>
            </tbody>
          </table>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
