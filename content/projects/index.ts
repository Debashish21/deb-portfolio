import type { Project } from "../types";
import { adoSprintPlanner } from "./ado-sprint-planner";
import { airLyrics } from "./airlyrics";
import { airLyricsLed } from "./airlyrics-led";
import { gmatClubCapture } from "./gmat-club-capture";
import { lifeOS } from "./lifeos";
import { missionW } from "./mission-w";
import { piggyBank } from "./piggy-bank";

/** Carousel order */
export const projects: Project[] = [piggyBank, missionW, gmatClubCapture, airLyrics, airLyricsLed, adoSprintPlanner, lifeOS];
