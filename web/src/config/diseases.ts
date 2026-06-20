/**
 * AngaWatch — Tomato disease & disorder reference library.
 *
 * Factual horticultural reference (symptoms / favouring conditions / treatment /
 * prevention), aligned with the AI model's leaf classes and the thresholds in
 * `tomato.ts`. Compiled from general plant-pathology knowledge; The Spruce's
 * "Identify, Treat & Prevent Tomato Diseases" guide was used as a topic checklist.
 * Guidance only — confirm chemical choices and rates with your agronomist and
 * local label/regulations.
 *
 * Each entry expects an image at `/images/diseases/<id>.jpg` (optional — the UI
 * falls back to a styled placeholder when the file is absent).
 */
import type { LeafClass } from './tomato'

export type DiseaseType = 'Fungal' | 'Bacterial' | 'Viral' | 'Pest' | 'Disorder'

export interface DiseaseInfo {
  id: string
  name: string
  type: DiseaseType
  pathogen?: string
  /** maps to an AI leaf-scan class where the model can detect it */
  aiClass?: LeafClass
  symptoms: string[]
  conditions: string
  treatment: string[]
  prevention: string[]
  image: string
}

const img = (id: string) => `/images/diseases/${id}.jpg`

export const DISEASES: DiseaseInfo[] = [
  {
    id: 'early-blight',
    name: 'Early blight',
    type: 'Fungal',
    pathogen: 'Alternaria solani / A. linariae',
    aiClass: 'Tomato_Early_blight',
    symptoms: [
      'Dark concentric "target" rings on older, lower leaves',
      'Yellow halo around spots; affected leaves brown and drop',
      'Dark sunken lesions on stems and near the fruit stem (collar rot)',
    ],
    conditions: 'Warm 24–29 °C with humidity, dew or leaf wetness; ageing or stressed plants.',
    treatment: [
      'Remove and destroy affected leaves at first sign',
      'Apply chlorothalonil or copper fungicide on a rotation',
      'Improve airflow and keep foliage dry',
    ],
    prevention: [
      'Mulch to stop soil splash onto leaves',
      'Stake and prune for airflow; avoid overhead watering',
      'Rotate crops 2–3 years; choose resistant varieties',
    ],
    image: img('early-blight'),
  },
  {
    id: 'late-blight',
    name: 'Late blight',
    type: 'Fungal',
    pathogen: 'Phytophthora infestans (oomycete)',
    aiClass: 'Tomato_Late_blight',
    symptoms: [
      'Large greasy grey-green to brown blotches on leaves',
      'White fuzzy mould on leaf undersides in humid conditions',
      'Firm brown greasy lesions on fruit; rapid plant collapse',
    ],
    conditions: 'Cool, wet weather — RH ≥ 90% and 10–26 °C with extended leaf wetness. Most destructive.',
    treatment: [
      'Act fast — remove and bag infected plants',
      'Apply preventive copper / chlorothalonil before it spreads',
      'Destroy volunteers and cull piles nearby',
    ],
    prevention: [
      'Ventilate to keep humidity below 85%',
      'Avoid overhead irrigation; water early in the day',
      'Plant resistant varieties; scout daily in cool, wet spells',
    ],
    image: img('late-blight'),
  },
  {
    id: 'septoria-leaf-spot',
    name: 'Septoria leaf spot',
    type: 'Fungal',
    pathogen: 'Septoria lycopersici',
    aiClass: 'Tomato_Septoria_leaf_spot',
    symptoms: [
      'Many small circular spots with dark borders and grey/tan centres',
      'Tiny black specks (fruiting bodies) within the spots',
      'Starts on lower leaves; heavy defoliation moving upward',
    ],
    conditions: 'Warm 20–25 °C with wet foliage, high humidity and splashing water.',
    treatment: [
      'Pick off spotted leaves promptly and bin them',
      'Copper or chlorothalonil fungicide on rotation',
      'Avoid handling plants while wet',
    ],
    prevention: [
      'Mulch and avoid overhead watering',
      'Space and prune for airflow',
      'Sanitise tools; rotate crops; clear debris at season end',
    ],
    image: img('septoria-leaf-spot'),
  },
  {
    id: 'leaf-mold',
    name: 'Leaf mould',
    type: 'Fungal',
    pathogen: 'Passalora fulva (Fulvia fulva)',
    aiClass: 'Tomato_Leaf_Mold',
    symptoms: [
      'Pale green to yellow patches on the upper leaf surface',
      'Olive-green to brown velvety mould on the underside',
      'Leaves curl, wither and drop — chiefly a greenhouse problem',
    ],
    conditions: 'Greenhouse-specific: RH > 85% and ~22–24 °C with poor ventilation.',
    treatment: [
      'Increase ventilation and cut humidity immediately',
      'Remove affected leaves; apply a labelled fungicide',
      'Reduce plant density',
    ],
    prevention: [
      'Vent and heat to hold RH below 85%',
      'Wide spacing and de-leafing for airflow',
      'Resistant cultivars; avoid prolonged leaf wetness',
    ],
    image: img('leaf-mold'),
  },
  {
    id: 'bacterial-spot',
    name: 'Bacterial spot',
    type: 'Bacterial',
    pathogen: 'Xanthomonas spp.',
    aiClass: 'Tomato_Bacterial_spot',
    symptoms: [
      'Small water-soaked spots turning dark brown/black with yellow halos',
      'Scabby raised spots on fruit; lesions on leaves and stems',
      'Scorched leaf edges; defoliation when severe',
    ],
    conditions: 'Warm 24–30 °C, wet and humid; spread by rain splash and handling.',
    treatment: [
      'Copper-based bactericides (limited once established)',
      'Remove infected plants; never work plants when wet',
      'No cure — focus on limiting spread',
    ],
    prevention: [
      'Use certified disease-free seed and transplants',
      'Avoid overhead irrigation and wet handling',
      'Rotate crops; sanitise tools and stakes',
    ],
    image: img('bacterial-spot'),
  },
  {
    id: 'target-spot',
    name: 'Target spot',
    type: 'Fungal',
    pathogen: 'Corynespora cassiicola',
    aiClass: 'Tomato_Target_Spot',
    symptoms: [
      'Small brown spots enlarging into concentric target-like rings',
      'Lesions on leaves, stems and fruit',
      'Pitted, sunken lesions on fruit',
    ],
    conditions: 'Warm, humid conditions with prolonged leaf wetness.',
    treatment: [
      'Fungicide rotation (e.g. chlorothalonil, strobilurins)',
      'Remove affected foliage and fruit',
      'Open up the canopy to improve airflow',
    ],
    prevention: [
      'Prune for airflow; avoid a dense canopy',
      'Drip irrigation; remove plant debris',
      'Crop rotation and sanitation',
    ],
    image: img('target-spot'),
  },
  {
    id: 'mosaic-virus',
    name: 'Tomato mosaic virus',
    type: 'Viral',
    pathogen: 'ToMV / TMV',
    aiClass: 'Tomato_mosaic_virus',
    symptoms: [
      'Mottled light- and dark-green mosaic on leaves',
      'Curled, narrow "fern-leaf" or distorted foliage',
      'Stunted growth; mottled or uneven fruit ripening',
    ],
    conditions: 'Mechanically spread by hands, tools and tobacco; a very stable virus.',
    treatment: [
      'No cure — remove and destroy infected plants',
      'Disinfect hands and tools (milk or dilute bleach solution)',
      'Control weed hosts',
    ],
    prevention: [
      'Wash hands; no tobacco use near plants',
      'Resistant varieties; certified seed',
      'Sanitise tools between plants',
    ],
    image: img('mosaic-virus'),
  },
  {
    id: 'yellow-leaf-curl-virus',
    name: 'Yellow leaf curl virus',
    type: 'Viral',
    pathogen: 'TYLCV (whitefly-vectored)',
    aiClass: 'Tomato_Yellow_Leaf_Curl_Virus',
    symptoms: [
      'Upward curling and cupping of leaves; yellow margins',
      'Severe stunting and bushy growth',
      'Heavy flower drop and poor fruit set',
    ],
    conditions: 'Transmitted by whiteflies; worse in warm seasons with high whitefly pressure.',
    treatment: [
      'No cure — rogue out infected plants quickly',
      'Control whiteflies (insecticidal soap, sticky traps, IPM)',
      'Use floating row covers / insect screens',
    ],
    prevention: [
      'Whitefly-resistant or tolerant varieties',
      'Reflective mulch and insect screening',
      'Manage weeds and alternate whitefly hosts',
    ],
    image: img('yellow-leaf-curl-virus'),
  },
  {
    id: 'fusarium-wilt',
    name: 'Fusarium wilt',
    type: 'Fungal',
    pathogen: 'Fusarium oxysporum f.sp. lycopersici',
    symptoms: [
      'Yellowing and wilting, often on one side or one branch first',
      'Brown discolouration in the stem vascular tissue',
      'Lower leaves yellow first; the plant eventually collapses',
    ],
    conditions: 'Warm soils (~28 °C); soil-borne and persists for years; worse in acidic sandy soils.',
    treatment: [
      'No cure — remove and destroy infected plants',
      'Solarise or replace contaminated soil',
      'Avoid excess nitrogen; manage soil pH',
    ],
    prevention: [
      'Resistant varieties (look for the "F" code)',
      'Long crop rotation; grafted rootstocks',
      'Clean soil/media and sanitation',
    ],
    image: img('fusarium-wilt'),
  },
  {
    id: 'verticillium-wilt',
    name: 'Verticillium wilt',
    type: 'Fungal',
    pathogen: 'Verticillium dahliae / V. albo-atrum',
    symptoms: [
      'Yellow V-shaped patches at leaf edges; daytime wilting',
      'Vascular browning in the stem (milder than Fusarium)',
      'Stunting and reduced yield',
    ],
    conditions: 'Cooler soils (~21–24 °C); wide host range; soil-borne and persistent.',
    treatment: [
      'No cure — remove affected plants',
      'Soil solarisation; avoid replanting susceptible crops',
      'Keep plants vigorous to limit impact',
    ],
    prevention: [
      'Resistant varieties (look for the "V" code)',
      'Rotate with non-host crops; grafted rootstocks',
      'Sanitation and clean growing media',
    ],
    image: img('verticillium-wilt'),
  },
  {
    id: 'powdery-mildew',
    name: 'Powdery mildew',
    type: 'Fungal',
    pathogen: 'Leveillula taurica / Oidium spp.',
    symptoms: [
      'White powdery growth on leaf surfaces',
      'Yellow blotches; leaves brown and shrivel',
      'Reduced photosynthesis; sun-scald on exposed fruit',
    ],
    conditions: '~22–30 °C with moderate humidity; common in greenhouses and warm-dry spells.',
    treatment: [
      'Sulfur, potassium bicarbonate or labelled fungicides',
      'Remove heavily infected leaves',
      'Improve airflow and light penetration',
    ],
    prevention: [
      'Spacing and pruning for airflow',
      'Avoid excess nitrogen',
      'Resistant varieties; monitor in warm, dry weather',
    ],
    image: img('powdery-mildew'),
  },
  {
    id: 'blossom-end-rot',
    name: 'Blossom-end rot',
    type: 'Disorder',
    pathogen: 'Calcium-related disorder (not infectious)',
    symptoms: [
      'Dark, sunken, leathery patch at the blossom (bottom) end of the fruit',
      'First fruits affected most; flesh beneath turns brown',
      'Not contagious — a physiological disorder',
    ],
    conditions: 'Calcium uptake disrupted by uneven watering, drought stress or high salts.',
    treatment: [
      'Keep soil moisture even and consistent',
      'Mulch to buffer moisture swings',
      'Correct calcium availability and target pH ~6.5',
    ],
    prevention: [
      'Steady irrigation; avoid drought/flood cycles',
      'Maintain pH ~6.5 with balanced calcium',
      'Avoid excess nitrogen and salt build-up',
    ],
    image: img('blossom-end-rot'),
  },
  {
    id: 'spider-mites',
    name: 'Two-spotted spider mites',
    type: 'Pest',
    pathogen: 'Tetranychus urticae',
    aiClass: 'Tomato_Spider_mites_two_spotted',
    symptoms: [
      'Fine pale stippling / speckling across leaves',
      'Bronzing and yellowing; fine webbing on undersides',
      'Leaves dry and drop; overall plant decline',
    ],
    conditions: 'Hot, dry and dusty conditions; mites breed rapidly in warm spells.',
    treatment: [
      'Hose off with water and raise humidity',
      'Insecticidal soap, horticultural oil or a miticide',
      'Introduce predatory mites (Phytoseiulus persimilis)',
    ],
    prevention: [
      'Avoid drought stress; keep humidity adequate',
      'Encourage natural predators',
      'Scout leaf undersides regularly',
    ],
    image: img('spider-mites'),
  },
  {
    id: 'tuta-absoluta',
    name: 'Tuta absoluta (leaf miner)',
    type: 'Pest',
    pathogen: 'Tuta absoluta (tomato leaf miner moth)',
    aiClass: 'Tuta_absoluta_damage',
    symptoms: [
      'Irregular translucent blotch mines in leaves',
      'Frass (droppings) inside mines; larvae bore into fruit',
      'Up to 80–100% crop loss if uncontrolled',
    ],
    conditions: 'Warm conditions; very fast lifecycle (~2 weeks); 7–12 generations per year.',
    treatment: [
      'Pheromone trapping and mass-trapping',
      'BT (Bacillus thuringiensis) or spinosad; rotate modes of action',
      'Remove and destroy mined leaves and fruit',
    ],
    prevention: [
      'Insect screening on greenhouse vents',
      'Monitor pheromone traps; time sprays with the degree-day model',
      'Sanitation, rotation and biocontrol (Nesidiocoris tenuis)',
    ],
    image: img('tuta-absoluta'),
  },
]

export const DISEASE_TYPE_TONE: Record<DiseaseType, 'amber' | 'red' | 'ink' | 'lime' | 'neutral'> = {
  Fungal: 'amber',
  Bacterial: 'red',
  Viral: 'ink',
  Pest: 'amber',
  Disorder: 'neutral',
}
