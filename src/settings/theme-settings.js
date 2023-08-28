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

// note that theme names may come from user input, so do not use them as keys in objects

// the first standard theme is the default theme which will be used if no other theme is specified
const standard_theme_names = [ 'light', 'dark' ];  // array length must match array length of values in standard_themes_spec

export function get_standard_theme_names() {
    return [ ...standard_theme_names ];
}

const standard_themes_spec = {  // first entry defines standard_theme_prop_names

    //                                          === LIGHT ===                    === DARK ===

    /* metrics */

    "--theme-hd-h":                           [ '1.5rem',                        '1.5rem' ],

    "--theme-tl-p":                           [ '0 0.5em',                       '0 0.5em' ],
    "--theme-tl-g":                           [ '0.5em',                         '0.5em' ],

    "--theme-cl-p":                           [ '0 0.5em',                       '0 0.5em' ],
    "--theme-cl-lh":                          [ '140%',                          '140%' ],
    "--theme-cl-ff":                          [ 'monospace',                     'monospace' ],

    "--theme-ou-p":                           [ '0.5em',                         '0.5em' ],
    "--theme-cl-p-inter":                     [ '1em',                           '1em' ],

    "--theme-ts-w":                           [ '1.5rem',                        '1.5rem' ],
    "--theme-ts-h":                           [ '1.5rem',                        '1.5rem' ],


    /* border */

    "--theme-hd-bdr":                         [ '0.125em',                       '0.125em' ],
    "--theme-hd-bdw":                         [ '1px',                           '1px' ],
    "--theme-hd-bds":                         [ 'solid',                         'solid' ],
    "--theme-hd-bdc":                         [ '#ccc',                          '#ccc' ],

    "--theme-tl-bdr":                         [ '0',                             '0' ],
    "--theme-tl-bdw":                         [ '1px',                           '1px' ],
    "--theme-tl-bds":                         [ 'solid',                         'solid' ],
    "--theme-tl-bdc":                         [ '#ccc',                          '#ccc' ],
    "--theme-tl-bdc-active":                  [ 'black',                         'black' ],

    "--theme-cl-bdr":                         [ '0.125em',                       '0.125em' ],
    "--theme-cl-bdw":                         [ '1px',                           '1px' ],
    "--theme-cl-bds":                         [ 'solid',                         'solid' ],
    "--theme-cl-bdc":                         [ '#ccc',                          '#ccc' ],
    "--theme-cl-bdc-active":                  [ 'black',                         'black' ],


    /* color */

    "--theme-by-bgc":                         [ '#eee',                          '#eee' ],
    "--theme-hd-bgc":                         [ '#f8f8f8',                       '#f8f8f8' ],
    "--theme-tl-bgc":                         [ 'hsl(  0deg   0%  98% / 100%)',  'hsl(  0deg   0%  98% / 100%)' ],
    "--theme-cl-bgc":                         [ 'hsl(  0deg   0%  99% / 100%)',  'hsl(  0deg   0%  99% / 100%)' ],
    "--theme-ou-bgc":                         [ 'white',                         'white' ],

    "--theme-by-bdc-error":                   [ 'hsl(  0deg   0%   0% / 100%)',  'hsl(  0deg   0%   0% / 100%)' ],
    "--theme-by-fgc-error":                   [ 'hsl(  0deg   0% 100% / 100%)',  'hsl(  0deg   0% 100% / 100%)' ],
    "--theme-by-bgc-error":                   [ 'hsl(  0deg  60%  50% / 100%)',  'hsl(  0deg  60%  50% / 100%)' ],

    "--theme-ty-bgc-markdown":                [ 'hsl(205deg 100%  94% / 100%)',  'hsl(205deg 100%  94% / 100%)' ],
    "--theme-ty-bgc-tex":                     [ 'hsl( 45deg  81%  87% / 100%)',  'hsl( 45deg  81%  87% / 100%)' ],
    "--theme-ty-bgc-javascript":              [ 'hsl( 85deg 100%  85% / 100%)',  'hsl( 85deg 100%  85% / 100%)' ],

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

    "--theme-ti-bdc-running":                 [ 'black',                         'black' ],
    "--theme-ti-bgc-running":                 [ 'hsl(120deg  94%  40% / 100%)',  'hsl(120deg  94%  40% / 100%)' ],

    "--theme-ti-bdc-modified":                [ 'black',                         'black' ],
    "--theme-ti-bgc-modified":                [ 'hsl(  0deg  60%  85% / 100%)',  'hsl(  0deg  60%  85% / 100%)' ],

    "--theme-ty-bgc":                         [ 'hsl(  0deg   0%  97% / 100%)',  'hsl(  0deg   0%  97% / 100%)' ],

    "--theme-mu-bgc":                         [ '#f0f0f0',                       '#f0f0f0' ],
    "--theme-mu-bdc":                         [ 'grey',                          'grey' ],
    "--theme-mu-shc":                         [ 'lightgrey',                     'lightgrey' ],
    "--theme-mi-fgc":                         [ 'black',                         'black' ],
    "--theme-mi-fgc-disabled":                [ '#bbb',                          '#bbb' ],
    "--theme-mi-bgc-selected":                [ '#0004',                         '#0004' ],
    "--theme-mi-msc":                         [ '#3334',                         '#3334' ],

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


    /* active output element highlight */

    "--theme-ou-hlw":                         [ '2px',                           '2px' ],
    "--theme-ou-hlc":                         [ 'black',                         'black' ],
    "--theme-ou-hls":                         [ 'dashed',                        'dashed' ],
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

export async function get_theme_settings_from_storage() {
    return storage_db.get(db_key_themes)
        .then((themes_from_db) => {
            validate_themes_array(themes_from_db);
            return themes_from_db;
        });
}

export async function put_theme_settings_to_storage(theme_settings) {
    validate_themes_array(theme_settings);
    return storage_db.put(db_key_themes, theme_settings);
}


export const theme_style_element_id = `themes-${generate_uuid()}`;

function get_theme_style_element() {
    return document.getElementById(theme_style_element_id);
}

const theme_name_validation_re      = /^[A-Za-z_-][A-Za-z0-9_-]*$/;
const theme_prop_name_validation_re = /^--theme-[A-Za-z_-][A-Za-z0-9_-]*$/;

const root_element = document.documentElement;
export const root_element_theme_attribute = 'data-theme';

// initialize themes in db if necessary, and write theme styles to the theme_style_element
await new Promise((resolve, reject) => {
    if (!document.head) {
        reject(new Error('document.head missing'));
    } else {
        return get_theme_settings_from_storage()
            .catch((_) => {
                console.log('initializing themes in storage_db');
                // initialize/reset database from standard_themes
                const themes = standard_themes;
                return put_theme_settings_to_storage(themes)
                    .then(() => {
                        return themes;
                    });
            })
            .catch(reject)
            .then((themes) => {
                const theme_style_element = create_element({
                    tag: 'style',
                    parent: document.head,
                    attrs: {
                        id: theme_style_element_id,
                    },
                });
                return write_themes_to_style_element(themes, theme_style_element);
            })
            .then(() => resolve())
            .catch(reject);
    }
});

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
        throw new Error('theme props must have valid CSS property names starting with --theme- and string values');
    }
}

async function write_themes_to_style_element(themes, theme_style_element) {
    validate_themes_array(themes);
    if (!(theme_style_element instanceof HTMLElement) || theme_style_element.tagName?.toLowerCase() !== 'style') {
        throw new Error('invalid theme_style_element');
    }
    const sections = [];
    sections.push(create_theme_properties_section(themes[0], true));  // default/unspecfied theme
    for (const theme of themes) {
        sections.push(create_theme_properties_section(theme));
    }
    theme_style_element.textContent = sections.join('\n');
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


// === SYSTEM THEME SETTINGS INTERFACE ===

export const dark_mode_media_query_list = globalThis.matchMedia("(prefers-color-scheme: dark)");

dark_mode_media_query_list.addEventListener('change', function (event) {
    theme_settings_updated_events.dispatch();
});


// === EVENT INTERFACE ===

export const theme_settings_updated_events = new Subscribable();


// === DOCUMENT DARK THEME SETTING ===

export function update_document_dark_state(dark_state) {
    if (dark_state) {
        root_element.setAttribute(root_element_theme_attribute, 'dark');
    } else {
        root_element.removeAttribute(root_element_theme_attribute);
    }
}


// === GET/UPDATE INTERFACE ===

function copy_theme_settings(theme_settings) {
    return JSON.parse(JSON.stringify(theme_settings));
}

let current_theme_settings = await get_theme_settings_from_storage();

export function get_theme_settings() {
    return copy_theme_settings(current_theme_settings);
}

export async function update_theme_settings(new_theme_settings) {
    new_theme_settings = copy_theme_settings(new_theme_settings);
    await put_theme_settings_to_storage(new_theme_settings);  // also validates
    current_theme_settings = new_theme_settings;
    theme_settings_updated_events.dispatch();
}
