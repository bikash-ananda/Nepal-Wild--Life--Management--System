// Inspired by react-hot-toast library
import { useState, useEffect } from "react";

const TOAST_LIMIT = 20;
const MAX_TOAST_DURATION = 15000;

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
};

let count = 0;

function genId() {
  count = (count + 1) % Number.MAX_VALUE;
  return count.toString();
}

const toastTimeouts = new Map();

function removeToast(toastId) {
  const timeout = toastTimeouts.get(toastId);
  if (timeout) clearTimeout(timeout);
  toastTimeouts.delete(toastId);
  dispatch({ type: actionTypes.REMOVE_TOAST, toastId });
}

export const reducer = (state, action) => {
  switch (action.type) {
    case actionTypes.ADD_TOAST:
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      };

    case actionTypes.UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      };

    case actionTypes.DISMISS_TOAST:
    case actionTypes.REMOVE_TOAST:
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        };
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      };
  }
};

const listeners = [];

let memoryState = { toasts: [] };

function dispatch(action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => {
    listener(memoryState);
  });
}

function toast({ duration = MAX_TOAST_DURATION, ...props }) {
  const id = genId();
  const safeDuration = Math.min(MAX_TOAST_DURATION, Math.max(0, Number(duration) || MAX_TOAST_DURATION));
  const expiresAt = Date.now() + safeDuration;

  const update = (props) =>
    dispatch({
      type: actionTypes.UPDATE_TOAST,
      toast: { ...props, id },
    });

  const dismiss = () => removeToast(id);

  dispatch({
    type: actionTypes.ADD_TOAST,
    toast: {
      ...props,
      id,
      duration: safeDuration,
      expiresAt,
      open: true,
      onOpenChange: (open) => { if (!open) dismiss(); },
    },
  });

  toastTimeouts.set(id, setTimeout(() => {
    toastTimeouts.delete(id);
    dispatch({ type: actionTypes.REMOVE_TOAST, toastId: id });
  }, safeDuration));

  return {
    id,
    dismiss,
    update,
  };
}

function useToast() {
  const [state, setState] = useState(memoryState);

  useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  return {
    ...state,
    toast,
    dismiss: (toastId) => {
      if (toastId === undefined) {
        [...toastTimeouts.keys()].forEach(removeToast);
        dispatch({ type: actionTypes.REMOVE_TOAST });
      } else removeToast(toastId);
    },
  };
}

export { useToast, toast };
