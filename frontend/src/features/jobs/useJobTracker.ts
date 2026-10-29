"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import { JobTracker } from "./JobTracker";
export function useJobTracker(owner:string){
 const [tracker]=useState(()=>new JobTracker());
 const snapshot=useSyncExternalStore(tracker.subscribe,tracker.getSnapshot,tracker.getSnapshot);
 useEffect(()=>{tracker.start(owner);return()=>tracker.stop();},[owner,tracker]);
 return {tracker,snapshot};
}
