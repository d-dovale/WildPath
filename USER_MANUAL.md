# WildPath User Manual

## Live Website

Use the deployed website here:

https://wild-path-frontend-navy.vercel.app/

## GitHub Repository

Project source code:

https://github.com/d-dovale/WildPath

## Purpose

WildPath helps users explore wildlife data through an interactive map and a quiz. The site combines two kinds of wildlife information:

- MoveBank tracking data stored in the project database
- Live GBIF occurrence data fetched when users search for a species

## Website Sections

WildPath currently has two main pages:

- `Explore`: the main interactive map page
- `Quiz`: an animal identification quiz

## How to Use the Explore Page

### 1. Open the site

When the site loads, the default page is the Explore page.

### 2. Search for a species

Use the `Search Species` input on the left sidebar.

- Type at least 2 characters
- Choose a species from the dropdown results
- Search results come from GBIF

After selection, the map loads GBIF occurrence points for that species and shows a species detail card.

### 3. Read species details

After selecting a species, the left panel shows a card with details such as:

- common name
- scientific name
- image
- conservation status
- description
- taxonomy summary

Depending on the source and available enrichment, details may also include Wikipedia or GBIF source links.

### 4. Use the map

The center of the screen is the map.

- Click a cluster to zoom in
- Click an individual point to open a popup
- GBIF points show occurrence details such as date, country, and basis of record
- MoveBank points show tracked-animal sighting details with timestamp information

### 5. Use filters

The Filters section changes based on the active data source.

When viewing MoveBank data:

- `Time Range`: Last 7 days, Last 30 days, or All time
- `Filter by visible area`: limits results to the current map bounds
- `Show movement paths`: draws path lines between stored sightings for tracked animals

When viewing GBIF data:

- `Year Range`: Last 5 years, Last 10 years, or All time
- `Filter by visible area`: limits occurrence results to the current map bounds
- `Show density heatmap`: adds a GBIF density layer for broader species coverage

### 6. Browse MoveBank species in the current map area

If `Filter by visible area` is enabled while using MoveBank data, a `Species in Area` panel appears below the filters.

Use this list to:

- see which stored species appear in the current map view
- select one of those species
- load its stored species card and tracked sightings

This is the main way to browse local MoveBank-backed species data in the current version of the site.

## How to Use the Quiz Page

### 1. Open the Quiz page

Use the top navigation bar and select `Quiz`.

### 2. Start the quiz

The quiz loads a short animal identification game.

- each round shows an animal image
- select the matching animal name from the answer choices
- move to the next question after answering

### 3. View your result

At the end of the quiz, the score screen shows your final score and lets you restart.

## Tips and Notes

- GBIF search is live and may return broad species matches
- MoveBank and GBIF are shown differently on the map, with different filters and detail cards
- Quiz questions depend on species images being available
- Some species data is enriched from iNaturalist and Wikipedia

## ERD Diagram

Current project ERD reference:

![WildPath ERD](https://i.ibb.co/WpNJ6Z1y/Wild-Path-Complete-ERD.png)
