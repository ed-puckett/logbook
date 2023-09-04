import {
    Subscribable,
} from '../../lib/sys/subscribable.js';

import {
    generate_uuid,
} from '../../lib/sys/uuid.js';

import {
    db_key_themes,
    storage_db,
} from './storage.js';

import {
    create_element,
    clear_element,
} from '../../lib/ui/dom-util.js';

import {
    get_settings,
    theme_system,
    theme_light,
    theme_dark,
    settings_updated_events,
} from './settings.js';


const theme_name_validation_re      = /^[A-Za-z_-][A-Za-z0-9_-]*$/;
const theme_prop_name_validation_re = /^--theme-[A-Za-z_-][A-Za-z0-9_-]*$/;

const root_element = document.documentElement;
export const root_element_theme_attribute = 'data-theme';


// === THEME STYLES ===

/*
  --- THEME PROPERTIES ---

  ELEMENT:
  by -- body
  hd -- header
  tl -- tool-bar
  ts -- tool-bar toggle-switch
  ty -- tool-bar type selector
  ti -- tool-bar indicator
  cl -- eval-cell/editor-cell
  ou -- output element
  mu -- menu
  mi -- menuitem
  ms -- menuitem separator
  dg -- dialog
  st -- settings dialog
  gr -- general graphics element

  STYLE FEATURE:        STYLE FEATURE ATTRIBUTE:
  bg -- background      c -- color
  fg -- foreground      w -- width
  bd -- border          s -- style (e.g., dashed)
  hl -- highlight       r -- radius
  sh -- shadow

  METRIC FEATURE:
  w -- width
  h -- height
  m -- margin
  p -- padding
  g -- gap

  OTHER FEATURE:
  ff -- font-family
  lh -- line-height

  ---

  PROPERTIES:
  --theme-{ELEMENT}-{STYLE FEATURE}{STYLE FEATURE ATTRIBUTE}...
  --theme-{ELEMENT}-{METRIC FEATURE}...
  --theme-{ELEMENT}-{OTHER FEATURE}...
*/

// NOTE THAT THEME NAMES MAY COME FROM USER INPUT, SO DO NOT USE THEM AS KEYS IN OBJECTS

// the first standard theme is the default theme which will be used if no other theme is specified
const standard_theme_names = [ 'light', 'dark' ];  // array length must match array length of values in standard_themes_spec

export function get_standard_theme_names() {
    return [ ...standard_theme_names ];
}

const standard_themes_spec = {
    //                                          === LIGHT ===                    === DARK ===

    "--theme-by-bgc":                         [ '#eee',                          '#222' ],

    "--theme-hd-h":                           [ '1.5rem',                        '1.5rem' ],
    "--theme-hd-bdr":                         [ '0.125em',                       '0.125em' ],
    "--theme-hd-bdw":                         [ '1px',                           '1px' ],
    "--theme-hd-bds":                         [ 'solid',                         'solid' ],
    "--theme-hd-bdc":                         [ '#ccc',                          '#666' ],
    "--theme-hd-bgc":                         [ '#f8f8f8',                       '#080808' ],

    "--theme-tl-p":                           [ '0 0.5em',                       '0 0.5em' ],
    "--theme-tl-g":                           [ '0.5em',                         '0.5em' ],
    "--theme-tl-bdr":                         [ '0',                             '0' ],
    "--theme-tl-bdw":                         [ '1px',                           '1px' ],
    "--theme-tl-bds":                         [ 'solid',                         'solid' ],
    "--theme-tl-bdc":                         [ '#ccc',                          '#444' ],
    "--theme-tl-bdc-active":                  [ 'black',                         '#666' ],
    "--theme-tl-bgc":                         [ 'transparent',                   '#080808' ],

    "--theme-cl-p":                           [ '0 0.5em',                       '0 0.5em' ],
    "--theme-cl-lh":                          [ '140%',                          '140%' ],
    "--theme-cl-ff":                          [ 'monospace',                     'monospace' ],
    "--theme-cl-bdr":                         [ '0.125em',                       '0.125em' ],
    "--theme-cl-bdw":                         [ '1px',                           '1px' ],
    "--theme-cl-bds":                         [ 'solid',                         'solid' ],
    "--theme-cl-bdc":                         [ '#ccc',                          '#444' ],
    "--theme-cl-bdc-active":                  [ 'black',                         '#555' ],
    "--theme-cl-fgc":                         [ 'black',                         '#eee' ],
    "--theme-cl-bgc":                         [ 'hsl(  0deg   0%  99% / 100%)',  '#111' ],
    "--theme-cl-p-inter":                     [ '1em',                           '1em' ],

    "--theme-ou-p":                           [ '0.5em',                         '0.5em' ],
    "--theme-ou-hlw":                         [ '2px',                           '2px' ],
    "--theme-ou-hlc":                         [ 'hsl( 10deg  70%  60% / 100%)',  'hsl( 54deg  40%  60% / 100%)' ],
    "--theme-ou-hls":                         [ 'dashed',                        'dashed' ],
    "--theme-ou-fgc":                         [ 'black',                         '#eee' ],
    "--theme-ou-bgc":                         [ 'white',                         'black' ],

    "--theme-by-bdc-error":                   [ 'hsl(  0deg   0%   0% / 100%)',  'hsl(  0deg   0%   0% / 100%)' ],
    "--theme-by-fgc-error":                   [ 'hsl(  0deg   0% 100% / 100%)',  'hsl(  0deg   0%   0% / 100%)' ],
    "--theme-by-bgc-error":                   [ 'hsl(  0deg  60%  50% / 100%)',  'hsl(  0deg  60%  50% / 100%)' ],

    "--theme-ty-fgc-markdown":                [ 'black',                         '#efeeee' ],
    "--theme-ty-bgc-markdown":                [ 'hsl(205deg 100%  94% / 100%)',  'hsl(205deg  20%  70% /  65%)' ],
    "--theme-ty-fgc-tex":                     [ 'black',                         '#eee' ],
    "--theme-ty-bgc-tex":                     [ 'hsl( 45deg  81%  87% / 100%)',  'hsl( 45deg  40%  40% /  65%)' ],
    "--theme-ty-fgc-javascript":              [ 'black',                         'black' ],
    "--theme-ty-bgc-javascript":              [ 'hsl( 85deg 100%  85% / 100%)',  'hsl( 85deg  25%  40% /  65%)' ],

    "--theme-ts-w":                           [ '1.5rem',                        '1.5rem' ],
    "--theme-ts-h":                           [ '1.5rem',                        '1.5rem' ],
    "--theme-ts-bgc-fill-editable":           [ 'transparent',                   'transparent' ],
    "--theme-ts-bgc-stroke-editable":         [ 'hsl(  0deg   9%  82% / 100%)',  'hsl(  0deg   9%  82% / 100%)' ],
    "--theme-ts-bgc-fill-editable-checked":   [ 'hsl(  0deg 100%  50% / 100%)',  'hsl(  0deg 100%  50% / 100%)' ],
    "--theme-ts-bgc-stroke-editable-checked": [ 'hsl( 53deg 100%  50% / 100%)',  'hsl( 53deg 100%  50% / 100%)' ],

    "--theme-ts-bgc-fill-visible":            [ 'transparent',                   'transparent' ],
    "--theme-ts-bgc-stroke-visible":          [ 'hsl(  0deg   9%  82% / 100%)',  'hsl(  0deg   9%  82% / 100%)' ],
    "--theme-ts-bgc-fill-visible-checked":    [ 'hsl(205deg 100%  83% / 100%)',  'hsl(205deg 100%  83% / 100%)' ],
    "--theme-ts-bgc-stroke-visible-checked":  [ 'hsl(  0deg 100%  45% / 100%)',  'hsl(  0deg 100%  45% / 100%)' ],

    "--theme-ts-bgc-fill-autoeval":           [ 'transparent',                   'transparent' ],
    "--theme-ts-bgc-stroke-autoeval":         [ 'hsl(  0deg   9%  82% / 100%)',  'hsl(  0deg   9%  82% / 100%)' ],
    "--theme-ts-bgc-fill-autoeval-checked":   [ 'transparent',                   'transparent' ],
    "--theme-ts-bgc-stroke-autoeval-checked": [ 'hsl(  0deg  60%  70% / 100%)',  'hsl(  0deg  60%  70% / 100%)' ],

    "--theme-ti-bdc":                         [ 'hsl(  0deg   9%  82% / 100%)',  'hsl(  0deg   9%  82% / 100%)' ],
    "--theme-ti-bgc":                         [ 'hsl(  0deg   0%  97% / 100%)',  'hsl(  0deg   0%  97% / 100%)' ],

    "--theme-ti-bdc-running":                 [ 'black',                         '#d5d5d5' ],
    "--theme-ti-bgc-running":                 [ 'hsl(120deg  94%  40% / 100%)',  'hsl(120deg  94%  40% / 100%)' ],

    "--theme-ti-bdc-modified":                [ 'black',                         '#d5d5d5' ],
    "--theme-ti-bgc-modified":                [ 'hsl(  0deg  60%  85% / 100%)',  'hsl(  0deg  55%  45% / 100%)' ],

    "--theme-ty-bgc":                         [ 'hsl(  0deg   0%  97% / 100%)',  'hsl(  0deg   0%  97% / 100%)' ],

    "--theme-mu-bgc":                         [ '#f0f0f0',                       '#202020' ],
    "--theme-mu-bdc":                         [ 'grey',                          'grey' ],
    "--theme-mu-shc":                         [ 'lightgrey',                     'darkgrey' ],
    "--theme-mi-fgc":                         [ 'black',                         '#eee' ],
    "--theme-mi-fgc-disabled":                [ '#bbb',                          '#666' ],
    "--theme-mi-bgc-selected":                [ '#0004',                         '#fff4' ],
    "--theme-mi-msc":                         [ '#3334',                         '#ccc4' ],

    "--theme-dg-shc":                         [ 'grey',                          'grey' ],

    "--theme-st-bgc":                         [ 'canvas',                        'canvas' ],

    "--theme-st-bdc-section":                 [ 'hsl(  0deg   0%   0% / 100%)',  'hsl(  0deg   0%   0% / 100%)' ],
    "--theme-st-bgc-section":                 [ 'hsl(  0deg   0%  98% / 100%)',  'hsl(  0deg   0%  98% / 100%)' ],
    "--theme-st-fgc-section":                 [ 'hsl(  0deg   0%   0% / 100%)',  'hsl(  0deg   0%   0% / 100%)' ],

    "--theme-st-bdc-section-heading":         [ '#aaa',                          '#aaa' ],
    "--theme-st-bgc-section-heading":         [ 'hsl(  0deg   0% 100% / 100%)',  'hsl(  0deg   0% 100% / 100%)' ],
    "--theme-st-fgc-section-heading":         [ 'hsl(  0deg   0%   0% / 100%)',  'hsl(  0deg   0%   0% / 100%)' ],

    "--theme-st-fgc-section-setting":         [ 'fieldtext',                     'fieldtext' ],
    "--theme-st-bgc-section-setting":         [ 'field',                         'field' ],

    "--theme-st-bdc-warning":                 [ 'hsl(  0deg   0%   0% / 100%)',  'hsl(  0deg   0%   0% / 100%)' ],
    "--theme-st-fgc-warning":                 [ 'hsl(  0deg   0%   0% / 100%)',  'hsl(  0deg   0%   0% / 100%)' ],
    "--theme-st-bgc-warning":                 [ 'hsl( 60deg  80%  50% / 100%)',  'hsl( 60deg  80%  50% / 100%)' ],

    "--theme-st-bdc-error":                   [ 'hsl(  0deg   0%   0% / 100%)',  'hsl(  0deg   0%   0% / 100%)' ],
    "--theme-st-fgc-error":                   [ 'hsl(  0deg   0% 100% / 100%)',  'hsl(  0deg   0% 100% / 100%)' ],
    "--theme-st-bgc-error":                   [ 'hsl(  0deg  60%  50% / 100%)',  'hsl(  0deg  60%  50% / 100%)' ],

    "--theme-gr-fgc":                         [ 'black',                         'white'  ],
    "--theme-gr-bgc":                         [ 'transparent',                   'transparent' ],
};

const standard_theme_prop_names = Object.keys(standard_themes_spec);

export function get_standard_theme_prop_names() {
    return [ ...standard_theme_prop_names ];
}

const standard_themes = standard_theme_names.map((theme_name, theme_idx) => {
    return {
        name: theme_name,
        props: Object.fromEntries(
            Object.entries(standard_themes_spec)
                .map(([ prop_name, mode_values ]) => {
                    return [ prop_name, mode_values[theme_idx] ];
                })
        ),
    };
});


// === TO/FROM STORAGE ===

export async function put_themes_settings_to_storage(themes_settings) {
    validate_themes_array(themes_settings);
    return storage_db.put(db_key_themes, themes_settings);
}

export async function get_themes_settings_from_storage() {
    return storage_db.get(db_key_themes)
        .then((themes_from_db) => {
            validate_themes_array(themes_from_db);
            return themes_from_db;
        });
}


// === THEME STYLE ELEMENT ===

export const themes_style_element_id = `themes-${generate_uuid()}`;

function get_themes_style_element() {
    return document.getElementById(themes_style_element_id);
}

function create_themes_style_element() {
    if (get_themes_style_element()) {
        throw new Error(`element with id ${themes_style_element_id} already exists`);
    }
    if (!document.head) {
        throw new Error('document.head missing');
    }
    return create_element({
        tag: 'style',
        parent: document.head,
        attrs: {
            id: themes_style_element_id,
        },
    });
}


// === VALIDATION AND INITIALIZATION ===

export function validate_theme(theme) {
    const { name, props } = theme;
    if (typeof name !== 'string' || !name.match(theme_name_validation_re)) {
        throw new Error('invalid theme name');
    }
    if ( typeof props !== 'object' ||
         !Object.entries(props).every(([ k, v ]) => {
             return ( typeof(k) === 'string' &&
                      k.match(theme_prop_name_validation_re) &&
                      typeof(v) === 'string' );
         })
       ) {
        throw new Error('theme props must have valid CSS property names starting with --theme- and with string values');
    }
}

function validate_themes_array(themes) {
    if (!Array.isArray(themes) || themes.length <= 0) {
        throw new Error('themes must be an array of valid themes with at least one element');
    }
    const names = new Set();
    for (const theme of themes) {
        validate_theme(theme);
        if (names.has(theme.name)) {
            throw new Error('themes must not contain entries with duplicate names');
        }
    }
}

function create_theme_properties_section(theme, default_mode=false) {
    const { name, props } = theme;
    return `\
:root${default_mode ? '' : `[${root_element_theme_attribute}="${name}"]`} {
${ Object.entries(props)
       .map(([ prop_name, prop_value ]) => {
           return `    ${prop_name}: ${prop_value};`;
       })
       .join('\n') }
}
`;
}

/** write the given themes into the themes_style_element.
    both inputs are validated
 * @param {Array} themes
 * @param {HTMLElement} themes_style_element
 */
async function write_themes_to_style_element(themes, themes_style_element) {
    validate_themes_array(themes);
    if (!(themes_style_element instanceof HTMLElement) || themes_style_element.tagName?.toLowerCase() !== 'style') {
        throw new Error('invalid themes_style_element');
    }
    const sections = [];
    sections.push(create_theme_properties_section(themes[0], true));  // default/unspecfied theme
    for (const theme of themes) {
        sections.push(create_theme_properties_section(theme));
    }
    themes_style_element.textContent = sections.join('\n');
}

/** initialize themes in db if necessary, and write theme styles to the themes_style_element
 * @param {Object|null|undefined} options: {
 *     create_style_element_if_needed?: Boolean,
 * }
 * @return {Array} newly-established theme_settings
 */
async function initialize_themes(options=null) {
    const {
        create_style_element_if_needed,
    } = (options ?? {});
    const themes_settings = await get_themes_settings_from_storage()
          .catch((_) => {
              const themes_settings = standard_themes;
              return put_themes_settings_to_storage(themes_settings)
                .then(() => {
                    return themes_settings;
                });
          })
          .then((themes_settings) => {
              const themes_style_element = get_themes_style_element()
                    ?? (!create_style_element_if_needed ? null : create_themes_style_element());
              return write_themes_to_style_element(themes_settings, themes_style_element)
                  .then(() => themes_settings);
          })
}


// === SYSTEM THEME SETTINGS INTERFACE ===

const dark_mode_media_query_list = globalThis.matchMedia("(prefers-color-scheme: dark)");

/** set the document attribute specified by root_element_theme_attribute
 *  according to the given state
 * @param {Boolean} dark_state
 */
function set_document_dark_state(dark_state) {
    if (dark_state) {
        root_element.setAttribute(root_element_theme_attribute, 'dark');
    } else {
        root_element.removeAttribute(root_element_theme_attribute);  // default: light
    }
}

/** update the dark state for the document according to the current system-level
 *  "prefers" setting (light, dark), but with priority to the user's setting for
 *  this program (system, light, dark).
 */
function update_document_dark_state() {
    switch (get_settings().theme) {
        default:
        case theme_system: {
            set_document_dark_state(dark_mode_media_query_list.matches);
            break;
        }
        case theme_light: {
            set_document_dark_state(false);
            break;
        }
        case theme_dark: {
            set_document_dark_state(true);
            break;
        }
    }
}


// === EVENT INTERFACE ===

export const themes_settings_updated_events = new Subscribable();


// === THEME SETTINGS GET/UPDATE INTERFACE ===

function copy_themes_settings(themes_settings) {
    return JSON.parse(JSON.stringify(themes_settings));
}

let _current_themes_settings = await get_themes_settings_from_storage();

export function get_themes_settings() {
    return copy_themes_settings(_current_themes_settings);
}

export async function update_themes_settings(new_themes_settings) {
    new_themes_settings = copy_themes_settings(new_themes_settings);
    await put_themes_settings_to_storage(new_themes_settings);  // also validates
    write_themes_to_style_element(new_themes_settings, get_themes_style_element());
    _current_themes_settings = new_themes_settings;
    themes_settings_updated_events.dispatch();
}

export async function reset_to_standard_themes_settings() {
    return update_themes_settings(standard_themes);
}


//////////////////////////////////////////////////////////////////////

function get_standard_themes_spec_from_document() {
    //!!!
}


// === INITIALIZATION ===

dark_mode_media_query_list.addEventListener('change', update_document_dark_state);
settings_updated_events.subscribe(update_document_dark_state);
update_document_dark_state();  // initialize now from current settings/themes_settings

await initialize_themes({ create_style_element_if_needed: true });
globalThis.reset_to_standard_themes_settings = reset_to_standard_themes_settings;//!!!
