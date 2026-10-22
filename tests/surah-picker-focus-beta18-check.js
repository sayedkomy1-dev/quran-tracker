'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const read=p=>fs.readFileSync(path.resolve(__dirname,'..',p),'utf8');
const version=read('VERSION').trim();
assert.equal(version,'11.12.1-beta.20');
const oldScroller=read('v10.js'),picker=read('js/features/surah-picker-17.js'),css=read('css/platform/surah-picker.css');
const region=oldScroller.split('function v10PositionSurahDropdown(key){')[1].split('function v10CloseOtherSurahDropdowns')[0];
assert(region.includes("el.classList.contains('ia-surah-picker')")&&region.includes('return'),
  'Legacy scroll capture must not relocate the modal picker');
assert(picker.includes("search.addEventListener('click',focusSearch)"),
  'Tap on search input must synchronously request keyboard focus');
assert(picker.includes("search.addEventListener('touchend',focusSearch,{passive:true})"),
  'Android touch needs focus directly in the user gesture');
assert(picker.includes('search.focus({preventScroll:true})'),
  'Focus must avoid unintended scroll, and run without delay');
assert(!picker.includes('search.readOnly=true') && !picker.includes('search.disabled=true'),
  'Modal search must be editable');
assert(picker.includes("// Do NOT focus any search field"),
  'Opening from arrow should not show keyboard until search is tapped');
assert(css.includes('overscroll-behavior:contain'),
  'Results should scroll inside picker');
assert(picker.includes('fillAyah(key);scheduleDraftSave();close(key)'),
  'Picker must keep the official session input/save flow');
console.log('PASS beta18: Android search-focus gesture and legacy-scroll isolation');
