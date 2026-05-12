import { create } from "zustand";

type DragState = {
  /** The skill body currently armed for the next terminal click. */
  payload: string | null;
  skillId: string | null;
  skillName: string | null;
  arm: (skill: { id: string; name: string; body: string }) => void;
  clear: () => void;
};

export const useDrag = create<DragState>((set) => ({
  payload: null,
  skillId: null,
  skillName: null,
  arm: (skill) =>
    set((state) =>
      state.skillId === skill.id
        ? { payload: null, skillId: null, skillName: null }
        : { payload: skill.body, skillId: skill.id, skillName: skill.name },
    ),
  clear: () => set({ payload: null, skillId: null, skillName: null }),
}));
