import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// ── Formatage nombres (évite le séparateur unicode de toLocaleString) ──
function fmt(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

type RGB = [number, number, number];

const PRIMARY: RGB   = [79, 142, 247];
const SUCCESS: RGB   = [46, 207, 138];
const WARNING: RGB   = [245, 166, 35];
const DANGER: RGB    = [240, 90,  90];
const DARK: RGB      = [15,  22,  40];
const TEXT: RGB      = [232, 237, 248];
const GRAY: RGB      = [90,  111, 148];
const LIGHT: RGB     = [248, 250, 252];

function entete(doc: jsPDF, titre: string, sousTitre?: string): number {
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...DARK);
  doc.rect(0, 0, W, 28, 'F');
  doc.setFontSize(18);
  doc.setTextColor(...PRIMARY);
  doc.setFont('helvetica', 'bold');
  doc.text('FROIDPOM', 14, 14);
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.setFont('helvetica', 'normal');
  doc.text('GESTION FRIGORIFIQUE', 14, 20);
  doc.setFontSize(13);
  doc.setTextColor(...TEXT);
  doc.setFont('helvetica', 'bold');
  doc.text(titre.toUpperCase(), W - 14, 12, { align: 'right' });
  if (sousTitre) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...GRAY);
    doc.text(sousTitre, W - 14, 19, { align: 'right' });
  }
  doc.setFontSize(7);
  doc.setTextColor(...GRAY);
  const now = new Date();
  doc.text(`Edite le ${now.toLocaleDateString('fr-FR')} a ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, W - 14, 25, { align: 'right' });
  return 35;
}

function pied(doc: jsPDF): void {
  const pages = doc.getNumberOfPages();
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFillColor(240, 243, 248);
    doc.rect(0, H - 10, W, 10, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text('Froidpom - Gestion Frigorifique', 14, H - 4);
    doc.text(`Page ${i} / ${pages}`, W - 14, H - 4, { align: 'right' });
  }
}

interface KpiItem { label: string; val: string; color?: RGB; }

function kpis(doc: jsPDF, y: number, items: KpiItem[]): number {
  const W = doc.internal.pageSize.getWidth();
  const w = (W - 28) / items.length;
  items.forEach((k, i) => {
    const x = 14 + i * w;
    doc.setFillColor(240, 243, 250);
    doc.roundedRect(x, y, w - 3, 18, 2, 2, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.setFont('helvetica', 'normal');
    doc.text(k.label.toUpperCase(), x + 4, y + 6);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    const col: RGB = k.color || DARK;
    doc.setTextColor(...col);
    doc.text(k.val, x + 4, y + 14);
  });
  return y + 22;
}

const HEAD_STYLE = { fillColor: DARK, textColor: TEXT, fontStyle: 'bold' as const };
const ALT_ROW    = { fillColor: LIGHT };
const TABLE_STYLE = { fontSize: 8, cellPadding: 3 };
const MARGIN = { left: 14, right: 14 };

// ── CLIENTS ───────────────────────────────────────────
export function pdfClients(clients: any[]): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const y = entete(doc, 'Liste des clients', `${clients.length} client(s)`);
  autoTable(doc, {
    startY: y + 4,
    head: [['#', 'Nom', 'Telephone', 'Email', 'Adresse', 'Notes']],
    body: clients.map((c, i) => [i + 1, c.nom || '-', c.telephone || '-', c.email || '-', c.adresse || '-', c.notes || '-']),
    styles: TABLE_STYLE,
    headStyles: HEAD_STYLE,
    alternateRowStyles: ALT_ROW,
    margin: MARGIN,
  });
  pied(doc);
  doc.save(`froidpom-clients-${today()}.pdf`);
}

// ── RÉSERVATIONS ──────────────────────────────────────
export function pdfReservations(reservations: any[], _clients: any[]): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  let y = entete(doc, 'Reservations', `${reservations.length} reservation(s)`);

  const totalBois   = reservations.reduce((s, r) => s + (Number(r.nbCaissesBois) || 0), 0);
  const totalPlast  = reservations.reduce((s, r) => s + (Number(r.nbCaissesPластique) || 0), 0);
  const totalMontant = reservations.reduce((s, r) => {
    return s + (Number(r.nbCaissesBois) || 0) * (Number(r.prixUnitaireBois) || 0)
             + (Number(r.nbCaissesPластique) || 0) * (Number(r.prixUnitairePlastique) || 0);
  }, 0);

  y = kpis(doc, y, [
    { label: 'Nb reservations', val: String(reservations.length), color: PRIMARY },
    { label: 'Total Bois',      val: fmt(totalBois),              color: WARNING },
    { label: 'Total Plastique', val: fmt(totalPlast),             color: PRIMARY },
    { label: 'Montant total',   val: `${fmt(totalMontant)} MAD`,  color: SUCCESS },
  ]);

  autoTable(doc, {
    startY: y + 4,
    head: [['Client', 'Date', 'Sortie prev.', 'Bois', 'Prix bois', 'Plastique', 'Prix plast.', 'Montant', 'Statut']],
    body: reservations.map(r => {
      const montant = (Number(r.nbCaissesBois) || 0) * (Number(r.prixUnitaireBois) || 0)
                    + (Number(r.nbCaissesPластique) || 0) * (Number(r.prixUnitairePlastique) || 0);
      return [
        r.client?.nom || '-',
        fmtDate(r.dateReservation),
        fmtDate(r.dateSortiePrevisionnelle),
        fmt(r.nbCaissesBois || 0),
        `${r.prixUnitaireBois || 0} MAD`,
        fmt(r.nbCaissesPластique || 0),
        `${r.prixUnitairePlastique || 0} MAD`,
        `${fmt(montant)} MAD`,
        r.statut || '-',
      ];
    }),
    styles: TABLE_STYLE,
    headStyles: HEAD_STYLE,
    alternateRowStyles: ALT_ROW,
    margin: MARGIN,
  });

  pied(doc);
  doc.save(`froidpom-reservations-${today()}.pdf`);
}

// ── ENTRÉES ───────────────────────────────────────────
export function pdfEntrees(entrees: any[]): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  let y = entete(doc, 'Entrees en chambre', `${entrees.length} entree(s)`);

  const totalBois   = entrees.filter(e => !e.typeCaisse || e.typeCaisse === 'bois').reduce((s, e) => s + e.nbCaisses, 0);
  const totalPlast  = entrees.filter(e => e.typeCaisse === 'plastique').reduce((s, e) => s + e.nbCaisses, 0);
  const totalTran   = entrees.filter(e => e.typeCaisse === 'tranger').reduce((s, e) => s + e.nbCaisses, 0);

  y = kpis(doc, y, [
    { label: 'Total entrees', val: String(entrees.length), color: PRIMARY },
    { label: 'Bois',          val: fmt(totalBois),         color: WARNING },
    { label: 'Plastique',     val: fmt(totalPlast),        color: PRIMARY },
    { label: 'Tranger',       val: fmt(totalTran),         color: [0, 212, 180] },
  ]);

  autoTable(doc, {
    startY: y + 4,
    head: [['Date', 'Client', 'Chambre', 'Type', 'Nb caisses', 'Reference']],
    body: entrees.map(e => [
      fmtDate(e.dateEntree),
      e.client?.nom || '-',
      e.chambre?.nom || '-',
      cap(e.typeCaisse || 'bois'),
      fmt(e.nbCaisses),
      e.reference || '-',
    ]),
    styles: TABLE_STYLE,
    headStyles: HEAD_STYLE,
    alternateRowStyles: ALT_ROW,
    columnStyles: { 4: { fontStyle: 'bold', halign: 'right' } },
    margin: MARGIN,
  });

  pied(doc);
  doc.save(`froidpom-entrees-${today()}.pdf`);
}

// ── SORTIES ───────────────────────────────────────────
export function pdfSorties(sorties: any[]): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  let y = entete(doc, 'Sorties de chambre', `${sorties.length} sortie(s)`);

  const totalBois  = sorties.filter(s => !s.typeCaisse || s.typeCaisse === 'bois').reduce((s, e) => s + e.nbCaisses, 0);
  const totalPlast = sorties.filter(s => s.typeCaisse === 'plastique').reduce((s, e) => s + e.nbCaisses, 0);
  const total      = sorties.reduce((s, e) => s + e.nbCaisses, 0);

  y = kpis(doc, y, [
    { label: 'Total sorties',  val: String(sorties.length), color: PRIMARY },
    { label: 'Total caisses',  val: fmt(total),             color: WARNING },
    { label: 'Bois',           val: fmt(totalBois),         color: WARNING },
    { label: 'Plastique',      val: fmt(totalPlast),        color: PRIMARY },
  ]);

  autoTable(doc, {
    startY: y + 4,
    head: [['Date', 'Client', 'Chambre', 'Type', 'Nb caisses', 'Reference']],
    body: sorties.map(s => [
      fmtDate(s.dateSortie),
      s.client?.nom || '-',
      s.chambre?.nom || '-',
      cap(s.typeCaisse || 'bois'),
      fmt(s.nbCaisses),
      s.reference || '-',
    ]),
    styles: TABLE_STYLE,
    headStyles: HEAD_STYLE,
    alternateRowStyles: ALT_ROW,
    columnStyles: { 4: { fontStyle: 'bold', halign: 'right' } },
    margin: MARGIN,
  });

  pied(doc);
  doc.save(`froidpom-sorties-${today()}.pdf`);
}

// ── PAIEMENTS ─────────────────────────────────────────
export function pdfPaiements(paiements: any[], totalReservations: number): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  let y = entete(doc, 'Paiements', `${paiements.length} paiement(s)`);

  const totalPaye = paiements.reduce((s, p) => s + (Number(p.montant) || 0), 0);
  const reste     = Math.max(0, totalReservations - totalPaye);

  y = kpis(doc, y, [
    { label: 'Montant reservations', val: `${fmt(totalReservations)} MAD`, color: PRIMARY },
    { label: 'Total paye',           val: `${fmt(totalPaye)} MAD`,         color: SUCCESS },
    { label: 'Reste a percevoir',    val: `${fmt(reste)} MAD`,             color: reste > 0 ? DANGER : SUCCESS },
    { label: 'Nb paiements',         val: String(paiements.length),         color: GRAY },
  ]);

  autoTable(doc, {
    startY: y + 4,
    head: [['Date', 'Client', 'Montant', 'Mode', 'Reference', 'Notes']],
    body: paiements.map(p => [
      fmtDate(p.datePaiement),
      p.client?.nom || '-',
      `${fmt(Number(p.montant))} MAD`,
      p.modePaiement || '-',
      p.reference || '-',
      p.notes || '-',
    ]),
    styles: TABLE_STYLE,
    headStyles: HEAD_STYLE,
    alternateRowStyles: ALT_ROW,
    columnStyles: { 2: { fontStyle: 'bold', halign: 'right' } },
    margin: MARGIN,
  });

  pied(doc);
  doc.save(`froidpom-paiements-${today()}.pdf`);
}

// ── LOCATIONS ─────────────────────────────────────────
export function pdfLocations(locations: any[]): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  let y = entete(doc, 'Location de caisses vides', `${locations.length} location(s)`);

  const totalLoue      = locations.reduce((s, l) => s + (Number(l.nbCaisses) || 0), 0);
  const totalRetourne  = locations.reduce((s, l) => s + (Number(l.nbCaissesRetournees) || 0), 0);
  const totalCirc      = locations.reduce((s, l) => s + Math.max(0, (Number(l.nbCaisses) || 0) - (Number(l.nbCaissesRetournees) || 0)), 0);

  y = kpis(doc, y, [
    { label: 'Total loue',     val: fmt(totalLoue),     color: PRIMARY },
    { label: 'Total retourne', val: fmt(totalRetourne), color: SUCCESS },
    { label: 'En circulation', val: fmt(totalCirc),     color: WARNING },
    { label: 'Nb lignes',      val: String(locations.length), color: GRAY },
  ]);

  autoTable(doc, {
    startY: y + 4,
    head: [['Date', 'Client', 'Type', 'Loue', 'Retourne', 'Restant', 'Retour prevu']],
    body: locations.map(l => {
      const restant = Math.max(0, (Number(l.nbCaisses) || 0) - (Number(l.nbCaissesRetournees) || 0));
      const type    = (!l.typeCaisse || l.typeCaisse === 'bois') ? 'Bois' : 'Plastique';
      return [
        fmtDate(l.dateLocation),
        l.client?.nom || '-',
        type,
        fmt(l.nbCaisses || 0),
        fmt(l.nbCaissesRetournees || 0),
        fmt(restant),
        fmtDate(l.dateRetourPrevu),
      ];
    }),
    styles: TABLE_STYLE,
    headStyles: HEAD_STYLE,
    alternateRowStyles: ALT_ROW,
    columnStyles: {
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { fontStyle: 'bold', halign: 'right' },
    },
    margin: MARGIN,
  });

  pied(doc);
  doc.save(`froidpom-locations-${today()}.pdf`);
}

// ── STOCK ─────────────────────────────────────────────
export function pdfStock(stockChambres: any, stockClients: any[]): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  let y = entete(doc, 'Suivi du stock', `Etat au ${new Date().toLocaleDateString('fr-FR')}`);

  const chambres = stockChambres?.chambres || [];

  y = kpis(doc, y, [
    { label: 'Stock total',    val: fmt(stockChambres?.totalStock || 0),     color: PRIMARY },
    { label: 'Disponible',     val: fmt(stockChambres?.totalDisponible || 0), color: SUCCESS },
    { label: 'Capacite totale',val: fmt(stockChambres?.totalCapacite || 0),   color: GRAY },
    { label: 'Taux global',    val: `${stockChambres?.tauxRemplissageGlobal || 0}%`, color: WARNING },
  ]);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('PAR CHAMBRE', 14, y + 4);

  autoTable(doc, {
    startY: y + 7,
    head: [['Chambre', 'Capacite', 'Stock actuel', 'Disponible', 'Taux']],
    body: chambres.map((c: any) => [
      c.nom,
      fmt(c.capaciteMax || 0),
      fmt(c.stockActuel || 0),
      fmt(c.disponible || 0),
      `${c.tauxRemplissage || 0}%`,
    ]),
    styles: TABLE_STYLE,
    headStyles: HEAD_STYLE,
    alternateRowStyles: ALT_ROW,
    margin: MARGIN,
  });

  const afterChambres = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('PAR CLIENT', 14, afterChambres);

  autoTable(doc, {
    startY: afterChambres + 4,
    head: [['Client', 'Total entre', 'Total sorti', 'Stock actuel', 'Chambres']],
    body: stockClients.filter(c => c.stockActuel > 0).map((c: any) => {
      const chambresDetail = Object.values(c.parChambre)
        .filter((ch: any) => ch.stock > 0)
        .map((ch: any) => `${ch.chambreNom}: ${fmt(ch.stock)}`)
        .join(', ');
      return [
        c.clientNom,
        fmt(c.totalEntree || 0),
        fmt(c.totalSortie || 0),
        fmt(c.stockActuel || 0),
        chambresDetail || '-',
      ];
    }),
    styles: TABLE_STYLE,
    headStyles: HEAD_STYLE,
    alternateRowStyles: ALT_ROW,
    columnStyles: { 3: { fontStyle: 'bold' } },
    margin: MARGIN,
  });

  pied(doc);
  doc.save(`froidpom-stock-${today()}.pdf`);
}

// ── Utilitaires ───────────────────────────────────────
function today(): string {
  return new Date().toISOString().split('T')[0];
}

function fmtDate(d?: string): string {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString('fr-FR'); }
  catch { return d; }
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}