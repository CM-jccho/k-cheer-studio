/* K-Cheer Studio · settings the shop owner edits */
window.KCS_CONFIG = {
  /* Paste the Gumroad product URL here when the shop is live.
     While it is empty the Pro panel says the shop is not connected yet. */
  proBuyUrl: 'https://jaechul4.gumroad.com/l/k-cheer-studio-pro',

  /* Pro pack price shown in the top bar. */
  proPrice: '$5.90',

  /* Licence codes are compared by a 32-bit hash, so no code sits in this file.
     To add a code: hash = 5381; for each character, upper-cased and with spaces
     removed, hash = (hash << 5) + hash + charCode, kept to 32 bits. */
  licenceHashes: [1690275084],

  /* Mark printed on free output. */
  freeMark: 'K-Cheer Studio',

  /* Output sizes in millimetres, and the dpi each plan may export. */
  sizes: {
    slogan: { w: 600, h: 200, label: '60 × 20 cm' },
    photocard: { w: 55, h: 85, label: '55 × 85 mm' },
    ticket: { w: 180, h: 70, label: '18 × 7 cm' },
    ribbon: { w: 60, h: 240, label: '6 × 24 cm' }
  },
  dpi: { free: 150, pro: 300 }
};
