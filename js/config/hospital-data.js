/**
 * =========================================================================
 * js/config/hospital-data.js
 * -------------------------------------------------------------------------
 * DATOS ESTÁTICOS DEL HOSPITAL SAN JOSÉ – TOVAR
 *
 * Contiene la estructura completa de áreas, sub-áreas y filas de la
 * plantilla estadística mensual, tal como aparece en el Excel oficial
 * "Formatos_Hospital_San_Jose_v2.xlsx".
 *
 * ESTRUCTURA DE UN ÁREA:
 *   {
 *     id:      'hematologia',          // clave interna única
 *     label:   'HEMATOLOGÍA COMPLETA', // nombre que muestra la UI
 *     icon:    '🩸',
 *     color:   '#e74c3c',
 *     hojas:   [ { id, label, grupos } ]   // 1 ó 2 hojas (como en el Excel)
 *   }
 *
 * ESTRUCTURA DE UN GRUPO (bloque de filas dentro de una hoja):
 *   {
 *     titulo:   'HEMATOLOGÍA COMPLETA',  // encabezado del bloque
 *     esTotal:  false,                   // true → fila auto-calculada
 *     filas:    ['EMERGENCIA ADULTO', ...]
 *   }
 * =========================================================================
 */

'use strict';

/** Información del hospital para los encabezados */
const HOSPITAL_INFO = {
  nombre: 'HOSPITAL II "SAN JOSÉ" TOVAR',
  bioanalista: 'Lic. Eliana Morales'
};

/**
 * Definición completa de las 4 áreas del laboratorio.
 * Cada área puede tener una o más "hojas" (como en el Excel).
 */
const HOSPITAL_AREAS = [
  // ───────────────────────────────────────────────────────────────
  // 1. HEMATOLOGÍA COMPLETA
  // ───────────────────────────────────────────────────────────────
  {
    id: 'hematologia',
    label: 'HEMATOLOGÍA COMPLETA',
    icon: '🩸',
    color: '#e74c3c',
    colorSoft: '#fdecea',
    hojas: [
      {
        id: 'hematologia_h1',
        label: 'Hematología',
        grupos: [
          {
            titulo: 'HEMATOLOGÍA COMPLETA',
            filas: [
              { id: 'hem_emerg_adulto',     label: 'EMERGENCIA ADULTO',     esTotal: false },
              { id: 'hem_emerg_pediatrica', label: 'EMERGENCIA PEDIÁTRICA', esTotal: false },
              { id: 'hem_hospitalizacion',  label: 'HOSPITALIZACIÓN',       esTotal: false },
              { id: 'hem_cons_externa',     label: 'CONSULTA EXTERNA',      esTotal: false },
              { id: 'hem_cons_especial',    label: 'CONSULTA ESPECIAL',     esTotal: false },
              { id: 'hem_total',            label: 'TOTAL',                 esTotal: true  }
            ]
          },
          {
            titulo: 'SUB-EXÁMENES',
            filas: [
              { id: 'sub_51_hemoglobina',   label: '5.1 Hemoglobina',              esTotal: false },
              { id: 'sub_52_hematocrito',   label: '5.2 Hematocrito',              esTotal: false },
              { id: 'sub_53_plaquetas',     label: '5.3 Plaquetas',                esTotal: false },
              { id: 'sub_54_diferencial',   label: '5.4 Diferencial',              esTotal: false },
              { id: 'sub_55_contaje_b',     label: '5.5 Contaje de B',             esTotal: false },
              { id: 'sub_56_vsg',           label: '5.6 VSG',                      esTotal: false },
              { id: 'sub_gota_gruesa',      label: 'Gota Gruesa',                  esTotal: false },
              { id: 'sub_58_frotis',        label: '5.8 Frotis de Sangre Periférica', esTotal: false },
              { id: 'sub_total',            label: 'TOTAL',                        esTotal: true  }
            ]
          },
          {
            titulo: 'PACIENTES HOSPITALIZADOS',
            filas: [
              { id: 'pac_emerg_adulto',     label: 'PAC. EMERGENCIA ADULTO',   esTotal: false },
              { id: 'pac_emerg_pediatrica', label: 'PAC. EMERGENCIA PEDIÁTRICA', esTotal: false },
              { id: 'pac_cons_externa',     label: 'PAC. CONSULTA EXTERNA',    esTotal: false },
              { id: 'pac_hosp',             label: 'PAC. HOSPITALIZACIÓN',     esTotal: false },
              { id: 'pac_pediatria',        label: '  PEDIATRÍA',              esTotal: false },
              { id: 'pac_med_interna',      label: '  MEDICINA INTERNA',       esTotal: false },
              { id: 'pac_obstetricia',      label: '  OBSTETRICIA',            esTotal: false },
              { id: 'pac_cirugia',          label: '  CIRUGÍA',                esTotal: false },
              { id: 'pac_traumatologia',    label: '  TRAUMATOLOGÍA',          esTotal: false },
              { id: 'pac_observacion',      label: '  OBSERVACIÓN',            esTotal: false }
            ]
          },
          {
            titulo: 'CONSULTA ESPECIAL',
            filas: [
              { id: 'ce_pac_cons_especial', label: 'PAC. CONSULTA ESPECIAL',  esTotal: false },
              { id: 'ce_pediatria',         label: '  PEDIATRÍA',             esTotal: false },
              { id: 'ce_cai',               label: '  CAI',                   esTotal: false },
              { id: 'ce_ginecologia',       label: '  GINECOLOGÍA',           esTotal: false },
              { id: 'ce_med_interna',       label: '  MEDICINA INTERNA',      esTotal: false },
              { id: 'ce_cirugia',           label: '  CIRUGÍA',               esTotal: false },
              { id: 'ce_epidemiologia',     label: '  EPIDEMIOLOGÍA',         esTotal: false },
              { id: 'ce_traumatologia',     label: '  TRAUMATOLOGÍA',         esTotal: false },
              { id: 'ce_neumonologia',      label: '  NEUMUNOLOGÍA',          esTotal: false },
              { id: 'ce_higiene_adulto',    label: '  HIGIENE DEL ADULTO',    esTotal: false }
            ]
          }
        ]
      }
    ]
  },

  // ───────────────────────────────────────────────────────────────
  // 2. UROANÁLISIS
  // ───────────────────────────────────────────────────────────────
  {
    id: 'uroanalisis',
    label: 'UROANÁLISIS',
    icon: '🧫',
    color: '#f39c12',
    colorSoft: '#fef9e7',
    hojas: [
      {
        id: 'uroanalisis_h1',
        label: 'Uroanálisis',
        grupos: [
          {
            titulo: 'UROANÁLISIS POR SERVICIO',
            filas: [
              { id: 'uro_emerg_adulto',     label: 'EMERGENCIA ADULTO',     esTotal: false },
              { id: 'uro_emerg_pediatrica', label: 'EMERGENCIA PEDIÁTRICA', esTotal: false },
              { id: 'uro_hospitalizacion',  label: 'HOSPITALIZACIÓN',       esTotal: false },
              { id: 'uro_cons_externa',     label: 'CONSULTA EXTERNA',      esTotal: false },
              { id: 'uro_cons_especial',    label: 'CONSULTA ESPECIAL',     esTotal: false },
              { id: 'uro_prenatal',         label: 'PRENATAL',              esTotal: false },
              { id: 'uro_total',            label: 'TOTAL',                 esTotal: true  }
            ]
          },
          {
            titulo: 'SUB-ANÁLISIS',
            filas: [
              { id: 'sub_uro_51_glucosa',    label: '5.1 Glucosa',           esTotal: false },
              { id: 'sub_uro_52_proteinas',  label: '5.2 Proteínas',         esTotal: false },
              { id: 'sub_uro_53_sedimentos', label: '5.3 Sedimentos',        esTotal: false },
              { id: 'sub_uro_54_ph',         label: '5.4 P.H',               esTotal: false },
              { id: 'sub_uro_55_densidad',   label: '5.5 Densidad',          esTotal: false },
              { id: 'sub_uro_56_pigmentos',  label: '5.6 Pigmentos Biliares', esTotal: false },
              { id: 'sub_uro_total',         label: 'TOTAL',                 esTotal: true  }
            ]
          },
          {
            titulo: 'MUESTRAS ESPECIALES',
            filas: [
              { id: 'uro_muestras_prenatal', label: 'MUESTRAS EMERG. PRENATAL', esTotal: false }
            ]
          },
          {
            titulo: 'PACIENTES HOSPITALIZADOS',
            filas: [
              { id: 'uro_pac_emerg_adulto',     label: 'PAC. EMERGENCIA ADULTO',      esTotal: false },
              { id: 'uro_pac_emerg_pediatrica', label: 'PAC. EMERGENCIA PEDIÁTRICA',  esTotal: false },
              { id: 'uro_pac_cons_externa',     label: 'PAC. CONSULTA EXTERNA',       esTotal: false },
              { id: 'uro_pac_hosp',             label: 'PAC. HOSPITALIZACIÓN',        esTotal: false },
              { id: 'uro_pediatria',            label: '  PEDIATRÍA',                 esTotal: false },
              { id: 'uro_med_interna',          label: '  MEDICINA INTERNA',          esTotal: false },
              { id: 'uro_obstetricia',          label: '  OBSTETRICIA',               esTotal: false },
              { id: 'uro_cirugia',              label: '  CIRUGÍA',                   esTotal: false },
              { id: 'uro_traumatologia',        label: '  TRAUMATOLOGÍA',             esTotal: false },
              { id: 'uro_observacion',          label: '  OBSERVACIÓN',               esTotal: false }
            ]
          },
          {
            titulo: 'CONSULTA ESPECIAL',
            filas: [
              { id: 'uro_ce_pediatria',     label: 'PAC. CONSULTA ESPECIAL',   esTotal: false },
              { id: 'uro_ce_cai',           label: '  CAI',                    esTotal: false },
              { id: 'uro_ce_ginecologia',   label: '  GINECOLOGÍA',            esTotal: false },
              { id: 'uro_ce_med_interna',   label: '  MEDICINA INTERNA',       esTotal: false },
              { id: 'uro_ce_cirugia',       label: '  CIRUGÍA',                esTotal: false },
              { id: 'uro_ce_epidemiologia', label: '  EPIDEMIOLOGÍA',          esTotal: false },
              { id: 'uro_ce_traumatologia', label: '  TRAUMATOLOGÍA',          esTotal: false },
              { id: 'uro_ce_neumonologia',  label: '  NEUMUNOLOGÍA',           esTotal: false },
              { id: 'uro_ce_higiene',       label: '  HIGIENE DEL ADULTO',     esTotal: false }
            ]
          }
        ]
      }
    ]
  },

  // ───────────────────────────────────────────────────────────────
  // 3. COPROANÁLISIS
  // ───────────────────────────────────────────────────────────────
  {
    id: 'coproanalisis',
    label: 'COPROANÁLISIS',
    icon: '💩',
    color: '#8e44ad',
    colorSoft: '#f5eef8',
    hojas: [
      {
        id: 'coproanalisis_h1',
        label: 'Exámenes y Parásitos',
        grupos: [
          {
            titulo: 'COPROANÁLISIS POR SERVICIO',
            filas: [
              { id: 'cop_emerg_adulto',     label: 'EMERGENCIA ADULTO',     esTotal: false },
              { id: 'cop_emerg_pediatrica', label: 'EMERGENCIA PEDIÁTRICA', esTotal: false },
              { id: 'cop_hospitalizacion',  label: 'HOSPITALIZACIÓN',       esTotal: false },
              { id: 'cop_cons_externa',     label: 'CONSULTA EXTERNA',      esTotal: false },
              { id: 'cop_cons_especial',    label: 'CONSULTA ESPECIAL',     esTotal: false }
            ]
          },
          {
            titulo: 'TIPOS DE EXAMEN',
            filas: [
              { id: 'cop_exa_sol_sal',      label: 'EXA. DIRECTOS SOL-SAL',   esTotal: false },
              { id: 'cop_exa_sol_lugol',    label: 'EXA. DIRECTOS SOL-LUGOL', esTotal: false },
              { id: 'cop_kato',             label: 'KATO',                    esTotal: false },
              { id: 'cop_sangre_oculta',    label: 'SANGRE OCULTA',           esTotal: false },
              { id: 'cop_muestras_pos',     label: 'Nº DE MUESTRAS POSITIVAS', esTotal: false },
              { id: 'cop_total',            label: 'TOTAL',                   esTotal: true  }
            ]
          },
          {
            titulo: 'EPIDEMIOLOGÍA – PARÁSITOS IDENTIFICADOS',
            filas: [
              { id: 'par_ascaris',          label: 'ASCARIS LUMBRICOIDES',         esTotal: false },
              { id: 'par_ancylostoma',      label: 'ANCYLOSTOMA',                  esTotal: false },
              { id: 'par_trichuris',        label: 'TRICHURIS TRICHURA',           esTotal: false },
              { id: 'par_enterobius',       label: 'ENTEROBIUS VERMICULARIS',      esTotal: false },
              { id: 'par_hymenolepis_nana', label: 'HYMENOLEPIS NANA',            esTotal: false },
              { id: 'par_hymenolepis_dim',  label: 'HYMENOLEPIS DIMINUTA',         esTotal: false },
              { id: 'par_entamoeba_hist',   label: 'ENTAMOEBA HISTOLÍTICA',       esTotal: false },
              { id: 'par_strongyloides',    label: 'STRONGYLOIDES ESTERCORALIS',  esTotal: false },
              { id: 'par_balantidium',      label: 'BALANTIDIUM COLI',            esTotal: false },
              { id: 'par_entamoeba_coli',   label: 'ENTAMOEBA COLI',              esTotal: false },
              { id: 'par_yodamoeba',        label: 'YODAMOEBA BUSTHLII',          esTotal: false },
              { id: 'par_endolimax',        label: 'ENDOLIMAX NANA',              esTotal: false },
              { id: 'par_giardia',          label: 'GIARDIA DUODENALE',           esTotal: false },
              { id: 'par_tricomonas',       label: 'TRICOMONAS HOMINIS',          esTotal: false },
              { id: 'par_chilomastix',      label: 'CHILOMASTIX MESNILI',         esTotal: false },
              { id: 'par_blastocystis',     label: 'BLASTOCYSTIS SSP',            esTotal: false },
              { id: 'par_taenia',           label: 'TAENIA SP',                   esTotal: false },
              { id: 'par_levaduras',        label: 'LEVADURAS',                   esTotal: false },
              { id: 'par_total',            label: 'TOTAL',                       esTotal: true  }
            ]
          }
        ]
      },
      {
        id: 'coproanalisis_h2',
        label: 'Hospitalización y Consulta',
        grupos: [
          {
            titulo: 'PACIENTES HOSPITALIZADOS',
            filas: [
              { id: 'cop2_emerg_adulto',    label: 'EMERGENCIA ADULTO',     esTotal: false },
              { id: 'cop2_emerg_pediatrica',label: 'EMERGENCIA PEDIÁTRICA', esTotal: false },
              { id: 'cop2_hospitalizacion', label: 'HOSPITALIZACIÓN',       esTotal: false },
              { id: 'cop2_cons_externa',    label: 'CONSULTA EXTERNA',      esTotal: false },
              { id: 'cop2_cons_especial',   label: 'CONSULTA ESPECIAL',     esTotal: false },
              { id: 'cop2_pediatria',       label: '  PEDIATRÍA',           esTotal: false },
              { id: 'cop2_med_interna',     label: '  MEDICINA INTERNA',    esTotal: false },
              { id: 'cop2_cirugia',         label: '  CIRUGÍA',             esTotal: false },
              { id: 'cop2_obstetricia',     label: '  OBSTETRICIA',         esTotal: false },
              { id: 'cop2_observacion',     label: '  OBSERVACIÓN',         esTotal: false },
              { id: 'cop2_total_hosp',      label: 'TOTAL',                 esTotal: true  }
            ]
          },
          {
            titulo: 'CONSULTA ESPECIAL',
            filas: [
              { id: 'cop2_ce_pediatria',    label: 'CONS. ESPEC. PEDIATRÍA',  esTotal: false },
              { id: 'cop2_ce_cirugia',      label: '  CIRUGÍA',               esTotal: false },
              { id: 'cop2_ce_medicina',     label: '  MEDICINA',              esTotal: false },
              { id: 'cop2_ce_ginecologia',  label: '  GINECOLOGÍA',           esTotal: false },
              { id: 'cop2_ce_cir_ped',      label: '  CIRUGÍA PEDIÁTRICA',    esTotal: false },
              { id: 'cop2_ce_neumonologia', label: '  NEUMUNOLOGÍA',          esTotal: false },
              { id: 'cop2_ce_nutricion',    label: '  NUTRICIÓN',             esTotal: false },
              { id: 'cop2_ce_traumatologia',label: '  TRAUMATOLOGÍA',         esTotal: false },
              { id: 'cop2_ce_epidemiologia',label: '  EPIDEMIOLOGÍA',         esTotal: false },
              { id: 'cop2_ce_familiar',     label: '  FAMILIAR',              esTotal: false },
              { id: 'cop2_ce_radiologia',   label: '  RADIOLOGÍA',            esTotal: false },
              { id: 'cop2_ce_psiquiatria',  label: '  PSIQUIATRÍA',           esTotal: false },
              { id: 'cop2_total_ce',        label: 'TOTAL',                   esTotal: true  }
            ]
          },
          {
            titulo: 'TOTALES GENERALES',
            filas: [
              { id: 'cop2_total_cons_ext',  label: 'TOTAL CONSULTA EXTERNA',  esTotal: true  },
              { id: 'cop2_total_general',   label: 'TOTAL GENERAL',           esTotal: true  }
            ]
          }
        ]
      }
    ]
  },

  // ───────────────────────────────────────────────────────────────
  // 4. SEROLOGÍA
  // ───────────────────────────────────────────────────────────────
  {
    id: 'serologia',
    label: 'SEROLOGÍA',
    icon: '🔬',
    color: '#27ae60',
    colorSoft: '#eafaf1',
    hojas: [
      {
        id: 'serologia_h1',
        label: 'Hepatitis, Embarazo y COVID',
        grupos: [
          {
            titulo: 'HEPATITIS A',
            filas: [
              { id: 'ser1_ha_emerg_adulto',    label: 'EMERGENCIA ADULTO',     esTotal: false },
              { id: 'ser1_ha_emerg_pediatrica',label: 'EMERGENCIA PEDIÁTRICA', esTotal: false },
              { id: 'ser1_ha_hospitalizacion', label: 'HOSPITALIZACIÓN',       esTotal: false },
              { id: 'ser1_ha_cons_externa',    label: 'CONSULTA EXTERNA',      esTotal: false },
              { id: 'ser1_ha_cons_especial',   label: 'CONSULTA ESPECIAL',     esTotal: false },
              { id: 'ser1_ha_total',           label: 'TOTAL HEPATITIS A',     esTotal: true  }
            ]
          },
          {
            titulo: 'HEPATITIS B',
            filas: [
              { id: 'ser1_hb_emerg_adulto',    label: 'EMERGENCIA ADULTO',     esTotal: false },
              { id: 'ser1_hb_emerg_pediatrica',label: 'EMERGENCIA PEDIÁTRICA', esTotal: false },
              { id: 'ser1_hb_hospitalizacion', label: 'HOSPITALIZACIÓN',       esTotal: false },
              { id: 'ser1_hb_cons_externa',    label: 'CONSULTA EXTERNA',      esTotal: false },
              { id: 'ser1_hb_cons_especial',   label: 'CONSULTA ESPECIAL',     esTotal: false },
              { id: 'ser1_hb_total',           label: 'TOTAL HEPATITIS B',     esTotal: true  }
            ]
          },
          {
            titulo: 'HEPATITIS C',
            filas: [
              { id: 'ser1_hc_emerg_adulto',    label: 'EMERGENCIA ADULTO',     esTotal: false },
              { id: 'ser1_hc_emerg_pediatrica',label: 'EMERGENCIA PEDIÁTRICA', esTotal: false },
              { id: 'ser1_hc_hospitalizacion', label: 'HOSPITALIZACIÓN',       esTotal: false },
              { id: 'ser1_hc_cons_externa',    label: 'CONSULTA EXTERNA',      esTotal: false },
              { id: 'ser1_hc_cons_especial',   label: 'CONSULTA ESPECIAL',     esTotal: false },
              { id: 'ser1_hc_total',           label: 'TOTAL HEPATITIS C',     esTotal: true  }
            ]
          },
          {
            titulo: 'PRUEBA DE EMBARAZO',
            filas: [
              { id: 'ser1_pe_emerg_adulto',    label: 'EMERGENCIA ADULTO',     esTotal: false },
              { id: 'ser1_pe_emerg_pediatrica',label: 'EMERGENCIA PEDIÁTRICA', esTotal: false },
              { id: 'ser1_pe_hospitalizacion', label: 'HOSPITALIZACIÓN',       esTotal: false },
              { id: 'ser1_pe_cons_externa',    label: 'CONSULTA EXTERNA',      esTotal: false },
              { id: 'ser1_pe_cons_especial',   label: 'CONSULTA ESPECIAL',     esTotal: false },
              { id: 'ser1_pe_total',           label: 'TOTAL PRUEBA DE EMBARAZO', esTotal: true }
            ]
          },
          {
            titulo: 'COVID-19',
            filas: [
              { id: 'ser1_cov_emerg_adulto',    label: 'EMERGENCIA ADULTO',    esTotal: false },
              { id: 'ser1_cov_emerg_pediatrica',label: 'EMERGENCIA PEDIÁTRICA',esTotal: false },
              { id: 'ser1_cov_hospitalizacion', label: 'HOSPITALIZACIÓN',      esTotal: false },
              { id: 'ser1_cov_cons_externa',    label: 'CONSULTA EXTERNA',     esTotal: false },
              { id: 'ser1_cov_cons_especial',   label: 'CONSULTA ESPECIAL',    esTotal: false },
              { id: 'ser1_cov_total',           label: 'TOTAL COVID-19',       esTotal: true  }
            ]
          }
        ]
      },
      {
        id: 'serologia_h2',
        label: 'VDRL, HIV, Dengue, H.Pylori y ASLO',
        grupos: [
          {
            titulo: 'VDRL',
            filas: [
              { id: 'ser2_vd_emerg_adulto',    label: 'EMERGENCIA ADULTO',     esTotal: false },
              { id: 'ser2_vd_emerg_pediatrica',label: 'EMERGENCIA PEDIÁTRICA', esTotal: false },
              { id: 'ser2_vd_hospitalizacion', label: 'HOSPITALIZACIÓN',       esTotal: false },
              { id: 'ser2_vd_cons_externa',    label: 'CONSULTA EXTERNA',      esTotal: false },
              { id: 'ser2_vd_cons_especial',   label: 'CONSULTA ESPECIAL',     esTotal: false },
              { id: 'ser2_vd_total',           label: 'TOTAL VDRL',            esTotal: true  }
            ]
          },
          {
            titulo: 'HIV',
            filas: [
              { id: 'ser2_hiv_emerg_adulto',    label: 'EMERGENCIA ADULTO',    esTotal: false },
              { id: 'ser2_hiv_emerg_pediatrica',label: 'EMERGENCIA PEDIÁTRICA',esTotal: false },
              { id: 'ser2_hiv_hospitalizacion', label: 'HOSPITALIZACIÓN',      esTotal: false },
              { id: 'ser2_hiv_cons_externa',    label: 'CONSULTA EXTERNA',     esTotal: false },
              { id: 'ser2_hiv_cons_especial',   label: 'CONSULTA ESPECIAL',    esTotal: false },
              { id: 'ser2_hiv_total',           label: 'TOTAL HIV',            esTotal: true  }
            ]
          },
          {
            titulo: 'DENGUE',
            filas: [
              { id: 'ser2_den_emerg_adulto',    label: 'EMERGENCIA ADULTO',    esTotal: false },
              { id: 'ser2_den_emerg_pediatrica',label: 'EMERGENCIA PEDIÁTRICA',esTotal: false },
              { id: 'ser2_den_hospitalizacion', label: 'HOSPITALIZACIÓN',      esTotal: false },
              { id: 'ser2_den_cons_externa',    label: 'CONSULTA EXTERNA',     esTotal: false },
              { id: 'ser2_den_cons_especial',   label: 'CONSULTA ESPECIAL',    esTotal: false },
              { id: 'ser2_den_total',           label: 'TOTAL DENGUE',         esTotal: true  }
            ]
          },
          {
            titulo: 'HELICOBACTER PYLORI SANGRE',
            filas: [
              { id: 'ser2_hp_emerg_adulto',    label: 'EMERGENCIA ADULTO',     esTotal: false },
              { id: 'ser2_hp_emerg_pediatrica',label: 'EMERGENCIA PEDIÁTRICA', esTotal: false },
              { id: 'ser2_hp_hospitalizacion', label: 'HOSPITALIZACIÓN',       esTotal: false },
              { id: 'ser2_hp_cons_externa',    label: 'CONSULTA EXTERNA',      esTotal: false },
              { id: 'ser2_hp_cons_especial',   label: 'CONSULTA ESPECIAL',     esTotal: false },
              { id: 'ser2_hp_total',           label: 'TOTAL HELICOBACTER PYLORI SANGRE', esTotal: true }
            ]
          },
          {
            titulo: 'ASLO',
            filas: [
              { id: 'ser2_aslo_emerg_adulto',    label: 'EMERGENCIA ADULTO',   esTotal: false },
              { id: 'ser2_aslo_emerg_pediatrica',label: 'EMERGENCIA PEDIÁTRICA',esTotal: false },
              { id: 'ser2_aslo_hospitalizacion', label: 'HOSPITALIZACIÓN',     esTotal: false },
              { id: 'ser2_aslo_cons_externa',    label: 'CONSULTA EXTERNA',    esTotal: false },
              { id: 'ser2_aslo_cons_especial',   label: 'CONSULTA ESPECIAL',   esTotal: false },
              { id: 'ser2_aslo_total',           label: 'TOTAL ASLO',          esTotal: true  }
            ]
          }
        ]
      }
    ]
  }
];

/** Lista de turnos disponibles */
const TURNOS = [
  { id: 'manana', label: 'MAÑANA' },
  { id: 'tarde',  label: 'TARDE'  },
  { id: 'noche',  label: 'NOCHE'  }
];

/** Nombres de meses en español */
const NOMBRES_MESES = [
  'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
  'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'
];

// ═══════════════════════════════════════════════════════════════════
// FUNCIONES DE MAPEO PARA AUTO-LLENADO DESDE REGISTRO DE ATENCIÓN
// ═══════════════════════════════════════════════════════════════════

/**
 * Determina el areaId del formato estadístico correspondiente a un examen.
 * Usa coincidencia por palabras clave en el nombre del examen.
 * @param {string} nombreExamen
 * @returns {string|null} areaId o null si no hay coincidencia
 */
function getAreaParaExamen(nombreExamen) {
  const n = (nombreExamen || '').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // quitar tildes para comparar

  // Hematología: sangre, hemograma, contaje, plaquetas, etc.
  if (/hemo|hemato|hemoglobin|hematocrit|plaqueta|leucocit|eritrocit|diferencial|vsg|velocidad\s*sedim|contaje|gota\s*gruesa|frotis/.test(n))
    return 'hematologia';

  // Uroanálisis: orina, urina, parcial de orina, etc.
  if (/orin|urin|uroan|uroanalisis|parcial.*orin|glucos.*urin|proteina.*urin|sedimento|densidad.*urin|pigmento\s*biliares|nitrito/.test(n))
    return 'uroanalisis';

  // Coproanálisis: heces, parásitos, copro, etc.
  if (/heces|fecal|copro|parasit|kato|lugol|sol.sal|oxiuro|ameba|entamoeba|giardia|ascaris|ancylostoma|trichuris|strongyloid|blastocyst|taenia|levadur|balantidium|endolimax|yodamoeba|hymenolepis|tricomonas|chilomastix|helicobacter.*heces|sangre\s*oculta/.test(n))
    return 'coproanalisis';

  // Serología: hepatitis, VIH, dengue, embarazo, COVID, VDRL, etc.
  if (/hepatitis|vdrl|vih\b|hiv\b|dengue|embarazo|covid|aslo|helicobacter.*sangu|serolog|prueba.*embaraz|rpr|sifilis|anticuerpo/.test(n))
    return 'serologia';

  return null; // Sin coincidencia conocida
}

/**
 * Determina el ID de la fila dentro de la primera hoja de un área,
 * basándose en el nombre del servicio de atención del paciente.
 *
 * @param {string} nombreServicio  – Nombre del servicio (ej. 'Emergencia Adulto')
 * @param {string} areaId          – ID del área destino
 * @returns {string|null}          – filaId del primer grupo del área, o null
 */
function getFilaParaServicio(nombreServicio, areaId) {
  const area = HOSPITAL_AREAS.find(a => a.id === areaId);
  if (!area) return null;

  const hoja = area.hojas[0];
  if (!hoja || !hoja.grupos.length) return null;

  const primerGrupo = hoja.grupos[0];
  const filas = primerGrupo.filas.filter(f => !f.esTotal);

  const key = inferirServicioKey(nombreServicio);

  if (key === 'emerg_pediatrica') {
    return filas.find(f => /pediatr/i.test(f.label))?.id ?? filas[0]?.id ?? null;
  }
  if (key === 'prenatal') {
    return filas.find(f => /prenatal/i.test(f.label))?.id ?? filas.find(f => /externa/i.test(f.label))?.id ?? filas[0]?.id ?? null;
  }
  if (key === 'cons_especial') {
    return filas.find(f => /especial/i.test(f.label))?.id ?? filas[0]?.id ?? null;
  }
  if (key === 'cons_externa') {
    return filas.find(f => /externa/i.test(f.label))?.id ?? filas[0]?.id ?? null;
  }
  if (key === 'hospitalizacion') {
    return filas.find(f => /hospitaliz/i.test(f.label))?.id ?? filas[0]?.id ?? null;
  }
  if (key === 'emerg_adulto') {
    return filas.find(f => /emergencia\s*adulto/i.test(f.label))?.id
        ?? filas.find(f => /emergencia/i.test(f.label))?.id
        ?? filas[0]?.id ?? null;
  }

  // Fallback para servicios específicos (ej. Pediatría, Medicina Interna, etc.)
  const n = (nombreServicio || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const coincidencia = filas.find(f => f.label.toLowerCase().includes(n));
  if (coincidencia) return coincidencia.id;

  return filas[0]?.id ?? null;
}

// ═══════════════════════════════════════════════════════════════════
// MAPEO DE CLAVES (KEYS) DE EXÁMENES PARA FORMATOS ESTADÍSTICOS
// ═══════════════════════════════════════════════════════════════════

const EXAMEN_KEY_MAP = {
  // Hematología Sub-Exámenes
  'sub_51_hemoglobina':   { areaId: 'hematologia', hojaId: 'hematologia_h1', filaId: 'sub_51_hemoglobina', label: '5.1 Hemoglobina' },
  'sub_52_hematocrito':   { areaId: 'hematologia', hojaId: 'hematologia_h1', filaId: 'sub_52_hematocrito', label: '5.2 Hematocrito' },
  'sub_53_plaquetas':     { areaId: 'hematologia', hojaId: 'hematologia_h1', filaId: 'sub_53_plaquetas', label: '5.3 Plaquetas' },
  'sub_54_diferencial':   { areaId: 'hematologia', hojaId: 'hematologia_h1', filaId: 'sub_54_diferencial', label: '5.4 Diferencial' },
  'sub_55_contaje_b':     { areaId: 'hematologia', hojaId: 'hematologia_h1', filaId: 'sub_55_contaje_b', label: '5.5 Contaje de B' },
  'sub_56_vsg':           { areaId: 'hematologia', hojaId: 'hematologia_h1', filaId: 'sub_56_vsg', label: '5.6 VSG' },
  'sub_gota_gruesa':      { areaId: 'hematologia', hojaId: 'hematologia_h1', filaId: 'sub_gota_gruesa', label: 'Gota Gruesa' },
  'sub_58_frotis':        { areaId: 'hematologia', hojaId: 'hematologia_h1', filaId: 'sub_58_frotis', label: '5.8 Frotis de Sangre Periférica' },
  'hem_general':          { areaId: 'hematologia', hojaId: 'hematologia_h1', label: 'Hematología Completa' },

  // Uroanálisis Sub-Análisis
  'sub_uro_51_glucosa':   { areaId: 'uroanalisis', hojaId: 'uroanalisis_h1', filaId: 'sub_uro_51_glucosa', label: '5.1 Glucosa' },
  'sub_uro_52_proteinas': { areaId: 'uroanalisis', hojaId: 'uroanalisis_h1', filaId: 'sub_uro_52_proteinas', label: '5.2 Proteínas' },
  'sub_uro_53_sedimentos':{ areaId: 'uroanalisis', hojaId: 'uroanalisis_h1', filaId: 'sub_uro_53_sedimentos', label: '5.3 Sedimentos' },
  'sub_uro_54_ph':        { areaId: 'uroanalisis', hojaId: 'uroanalisis_h1', filaId: 'sub_uro_54_ph', label: '5.4 P.H' },
  'sub_uro_55_densidad':  { areaId: 'uroanalisis', hojaId: 'uroanalisis_h1', filaId: 'sub_uro_55_densidad', label: '5.5 Densidad' },
  'sub_uro_56_pigmentos': { areaId: 'uroanalisis', hojaId: 'uroanalisis_h1', filaId: 'sub_uro_56_pigmentos', label: '5.6 Pigmentos Biliares' },
  'uro_general':          { areaId: 'uroanalisis', hojaId: 'uroanalisis_h1', label: 'Uroanálisis / Orina' },

  // Coproanálisis Tipos y Parásitos
  'cop_exa_sol_sal':      { areaId: 'coproanalisis', hojaId: 'coproanalisis_h1', filaId: 'cop_exa_sol_sal', label: 'EXA. DIRECTOS SOL-SAL' },
  'cop_exa_sol_lugol':    { areaId: 'coproanalisis', hojaId: 'coproanalisis_h1', filaId: 'cop_exa_sol_lugol', label: 'EXA. DIRECTOS SOL-LUGOL' },
  'cop_kato':             { areaId: 'coproanalisis', hojaId: 'coproanalisis_h1', filaId: 'cop_kato', label: 'KATO' },
  'cop_sangre_oculta':    { areaId: 'coproanalisis', hojaId: 'coproanalisis_h1', filaId: 'cop_sangre_oculta', label: 'SANGRE OCULTA' },
  'cop_muestras_pos':     { areaId: 'coproanalisis', hojaId: 'coproanalisis_h1', filaId: 'cop_muestras_pos', label: 'Nº DE MUESTRAS POSITIVAS' },
  'cop_general':          { areaId: 'coproanalisis', hojaId: 'coproanalisis_h1', label: 'Coproanálisis / Heces' },

  'par_ascaris':          { areaId: 'coproanalisis', hojaId: 'coproanalisis_h1', filaId: 'par_ascaris', label: 'ASCARIS LUMBRICOIDES' },
  'par_ancylostoma':      { areaId: 'coproanalisis', hojaId: 'coproanalisis_h1', filaId: 'par_ancylostoma', label: 'ANCYLOSTOMA' },
  'par_trichuris':        { areaId: 'coproanalisis', hojaId: 'coproanalisis_h1', filaId: 'par_trichuris', label: 'TRICHURIS TRICHURA' },
  'par_enterobius':       { areaId: 'coproanalisis', hojaId: 'coproanalisis_h1', filaId: 'par_enterobius', label: 'ENTEROBIUS VERMICULARIS' },
  'par_hymenolepis_nana': { areaId: 'coproanalisis', hojaId: 'coproanalisis_h1', filaId: 'par_hymenolepis_nana', label: 'HYMENOLEPIS NANA' },
  'par_hymenolepis_dim':  { areaId: 'coproanalisis', hojaId: 'coproanalisis_h1', filaId: 'par_hymenolepis_dim', label: 'HYMENOLEPIS DIMINUTA' },
  'par_entamoeba_hist':   { areaId: 'coproanalisis', hojaId: 'coproanalisis_h1', filaId: 'par_entamoeba_hist', label: 'ENTAMOEBA HISTOLÍTICA' },
  'par_strongyloides':    { areaId: 'coproanalisis', hojaId: 'coproanalisis_h1', filaId: 'par_strongyloides', label: 'STRONGYLOIDES ESTERCORALIS' },
  'par_balantidium':      { areaId: 'coproanalisis', hojaId: 'coproanalisis_h1', filaId: 'par_balantidium', label: 'BALANTIDIUM COLI' },
  'par_entamoeba_coli':   { areaId: 'coproanalisis', hojaId: 'coproanalisis_h1', filaId: 'par_entamoeba_coli', label: 'ENTAMOEBA COLI' },
  'par_yodamoeba':        { areaId: 'coproanalisis', hojaId: 'coproanalisis_h1', filaId: 'par_yodamoeba', label: 'YODAMOEBA BUSTHLII' },
  'par_endolimax':        { areaId: 'coproanalisis', hojaId: 'coproanalisis_h1', filaId: 'par_endolimax', label: 'ENDOLIMAX NANA' },
  'par_giardia':          { areaId: 'coproanalisis', hojaId: 'coproanalisis_h1', filaId: 'par_giardia', label: 'GIARDIA DUODENALE' },
  'par_tricomonas':       { areaId: 'coproanalisis', hojaId: 'coproanalisis_h1', filaId: 'par_tricomonas', label: 'TRICOMONAS HOMINIS' },
  'par_chilomastix':      { areaId: 'coproanalisis', hojaId: 'coproanalisis_h1', filaId: 'par_chilomastix', label: 'CHILOMASTIX MESNILI' },
  'par_blastocystis':     { areaId: 'coproanalisis', hojaId: 'coproanalisis_h1', filaId: 'par_blastocystis', label: 'BLASTOCYSTIS SSP' },
  'par_taenia':           { areaId: 'coproanalisis', hojaId: 'coproanalisis_h1', filaId: 'par_taenia', label: 'TAENIA SP' },
  'par_levaduras':        { areaId: 'coproanalisis', hojaId: 'coproanalisis_h1', filaId: 'par_levaduras', label: 'LEVADURAS' },

  // Serología Exámenes (usan grupos especiales por servicio)
  'ser1_ha':   { areaId: 'serologia', hojaId: 'serologia_h1', serologiaGroup: 'ser1_ha', label: 'HEPATITIS A' },
  'ser1_hb':   { areaId: 'serologia', hojaId: 'serologia_h1', serologiaGroup: 'ser1_hb', label: 'HEPATITIS B' },
  'ser1_hc':   { areaId: 'serologia', hojaId: 'serologia_h1', serologiaGroup: 'ser1_hc', label: 'HEPATITIS C' },
  'ser1_pe':   { areaId: 'serologia', hojaId: 'serologia_h1', serologiaGroup: 'ser1_pe', label: 'PRUEBA DE EMBARAZO' },
  'ser1_cov':  { areaId: 'serologia', hojaId: 'serologia_h1', serologiaGroup: 'ser1_cov', label: 'COVID-19' },
  'ser2_vd':   { areaId: 'serologia', hojaId: 'serologia_h2', serologiaGroup: 'ser2_vd', label: 'VDRL' },
  'ser2_hiv':  { areaId: 'serologia', hojaId: 'serologia_h2', serologiaGroup: 'ser2_hiv', label: 'HIV' },
  'ser2_den':  { areaId: 'serologia', hojaId: 'serologia_h2', serologiaGroup: 'ser2_den', label: 'DENGUE' },
  'ser2_hp':   { areaId: 'serologia', hojaId: 'serologia_h2', serologiaGroup: 'ser2_hp', label: 'HELICOBACTER PYLORI SANGRE' },
  'ser2_aslo': { areaId: 'serologia', hojaId: 'serologia_h2', serologiaGroup: 'ser2_aslo', label: 'ASLO' }
};

/**
 * Infiere la clave (key) interna de un examen a partir de su nombre si no la tiene asignada.
 * @param {string} nombreExamen
 * @returns {string|null}
 */
function inferirExamenKey(nombreExamen) {
  const n = (nombreExamen || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/hemoglobin/.test(n)) return 'sub_51_hemoglobina';
  if (/hematocrit/.test(n)) return 'sub_52_hematocrito';
  if (/plaqueta/.test(n)) return 'sub_53_plaquetas';
  if (/diferencial/.test(n)) return 'sub_54_diferencial';
  if (/contaje.*b/.test(n)) return 'sub_55_contaje_b';
  if (/vsg|velocidad.*sediment/.test(n)) return 'sub_56_vsg';
  if (/gota.*gruesa/.test(n)) return 'sub_gota_gruesa';
  if (/frotis/.test(n)) return 'sub_58_frotis';
  if (/hemo|hemato/.test(n)) return 'hem_general';

  if (/glucos.*urin|glucosa/.test(n)) return 'sub_uro_51_glucosa';
  if (/proteina/.test(n)) return 'sub_uro_52_proteinas';
  if (/sedimento/.test(n)) return 'sub_uro_53_sedimentos';
  if (/p\.?h/.test(n)) return 'sub_uro_54_ph';
  if (/densidad/.test(n)) return 'sub_uro_55_densidad';
  if (/pigmento/.test(n)) return 'sub_uro_56_pigmentos';
  if (/orin|urin|uroan/.test(n)) return 'uro_general';

  if (/sol.*sal/.test(n)) return 'cop_exa_sol_sal';
  if (/sol.*lugol/.test(n)) return 'cop_exa_sol_lugol';
  if (/kato/.test(n)) return 'cop_kato';
  if (/sangre.*oculta/.test(n)) return 'cop_sangre_oculta';
  if (/ascaris/.test(n)) return 'par_ascaris';
  if (/ancylostoma/.test(n)) return 'par_ancylostoma';
  if (/trichuris/.test(n)) return 'par_trichuris';
  if (/enterobius/.test(n)) return 'par_enterobius';
  if (/hymenolepis.*nana/.test(n)) return 'par_hymenolepis_nana';
  if (/hymenolepis.*dim/.test(n)) return 'par_hymenolepis_dim';
  if (/entamoeba.*hist/.test(n)) return 'par_entamoeba_hist';
  if (/strongyloid/.test(n)) return 'par_strongyloides';
  if (/balantidium/.test(n)) return 'par_balantidium';
  if (/entamoeba.*coli/.test(n)) return 'par_entamoeba_coli';
  if (/yodamoeba/.test(n)) return 'par_yodamoeba';
  if (/endolimax/.test(n)) return 'par_endolimax';
  if (/giardia/.test(n)) return 'par_giardia';
  if (/tricomonas/.test(n)) return 'par_tricomonas';
  if (/chilomastix/.test(n)) return 'par_chilomastix';
  if (/blastocyst/.test(n)) return 'par_blastocystis';
  if (/taenia/.test(n)) return 'par_taenia';
  if (/levadur/.test(n)) return 'par_levaduras';
  if (/heces|copro/.test(n)) return 'cop_general';

  if (/hepatitis.*a\b/.test(n)) return 'ser1_ha';
  if (/hepatitis.*b\b/.test(n)) return 'ser1_hb';
  if (/hepatitis.*c\b/.test(n)) return 'ser1_hc';
  if (/embaraz/.test(n)) return 'ser1_pe';
  if (/covid/.test(n)) return 'ser1_cov';
  if (/vdrl/.test(n)) return 'ser2_vd';
  if (/vih|hiv/.test(n)) return 'ser2_hiv';
  if (/dengue/.test(n)) return 'ser2_den';
  if (/helicobacter/.test(n)) return 'ser2_hp';
  if (/aslo/.test(n)) return 'ser2_aslo';

  return null;
}

// Lista completa de servicios predeterminados del hospital basados en los Formatos
const SERVICIOS_PREDETERMINADOS = [
  { nombre: 'Emergencia Adulto',     key: 'emerg_adulto' },
  { nombre: 'Emergencia Pediátrica', key: 'emerg_pediatrica' },
  { nombre: 'Hospitalización',       key: 'hospitalizacion' },
  { nombre: 'Consulta Externa',      key: 'cons_externa' },
  { nombre: 'Consulta Especial',     key: 'cons_especial' },
  { nombre: 'Prenatal',              key: 'prenatal' },
  { nombre: 'Pediatría',             key: 'pediatria' },
  { nombre: 'Medicina Interna',      key: 'med_interna' },
  { nombre: 'Obstetricia',          key: 'obstetricia' },
  { nombre: 'Cirugía',              key: 'cirugia' },
  { nombre: 'Traumatología',        key: 'traumatologia' },
  { nombre: 'Observación',          key: 'observacion' },
  { nombre: 'CAI',                  key: 'cai' },
  { nombre: 'Ginecología',          key: 'ginecologia' },
  { nombre: 'Epidemiología',        key: 'epidemiologia' },
  { nombre: 'Neumonología',         key: 'neumonologia' },
  { nombre: 'Higiene del Adulto',   key: 'higiene_adulto' }
];

/**
 * Infiere la clave (key) interna de un servicio de atención a partir de su nombre.
 * @param {string} nombreServicio
 * @returns {string}
 */
function inferirServicioKey(nombreServicio) {
  const n = (nombreServicio || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/emerg.*pediatr|pediatr.*emerg/.test(n)) return 'emerg_pediatrica';
  if (/emerg/.test(n)) return 'emerg_adulto';
  if (/hospitaliz/.test(n)) return 'hospitalizacion';
  if (/consulta\s*especial|cons.*esp/.test(n)) return 'cons_especial';
  if (/consulta\s*externa|cons.*ext/.test(n)) return 'cons_externa';
  if (/prenatal/.test(n)) return 'prenatal';
  if (/pediatr/.test(n)) return 'pediatria';
  if (/med.*interna/.test(n)) return 'med_interna';
  if (/obstetric/.test(n)) return 'obstetricia';
  if (/cirug/.test(n)) return 'cirugia';
  if (/traumatolog/.test(n)) return 'traumatologia';
  if (/observac/.test(n)) return 'observacion';
  if (/\bcai\b/.test(n)) return 'cai';
  if (/ginecolog/.test(n)) return 'ginecologia';
  if (/epidemiolog/.test(n)) return 'epidemiologia';
  if (/neumonolog/.test(n)) return 'neumonologia';
  if (/higiene/.test(n)) return 'higiene_adulto';

  return 'srv_custom';
}

/**
 * Obtiene el sufijo de fila de serología según la key o el nombre del servicio.
 * @param {string} nombreServicio
 * @returns {string}
 */
function getSerologiaSuffix(nombreServicio) {
  const sKey = inferirServicioKey(nombreServicio);
  if (sKey === 'emerg_pediatrica') return 'emerg_pediatrica';
  if (sKey === 'cons_especial')    return 'cons_especial';
  if (sKey === 'cons_externa')     return 'cons_externa';
  if (sKey === 'hospitalizacion')  return 'hospitalizacion';
  return 'emerg_adulto';
}

/**
 * Obtiene el destino en los Formatos Estadísticos a partir de la key del examen y el nombre del servicio.
 * @param {string} examenKey
 * @param {string} servicioNombre
 * @returns {{ areaId: string, hojaId: string, filaExamenId: string|null, filaServicioId: string|null }|null}
 */
function obtenerDestinoFormato(examenKey, servicioNombre) {
  if (!examenKey) return null;
  const config = EXAMEN_KEY_MAP[examenKey];
  if (!config) return null;

  const areaId = config.areaId;
  const hojaId = config.hojaId;

  let filaExamenId = config.filaId || null;
  let filaServicioId = null;

  if (config.serologiaGroup) {
    const sfx = getSerologiaSuffix(servicioNombre);
    filaServicioId = `${config.serologiaGroup}_${sfx}`;
    filaExamenId = filaServicioId;
  } else {
    filaServicioId = getFilaParaServicio(servicioNombre, areaId);
  }

  return { areaId, hojaId, filaExamenId, filaServicioId };
}


