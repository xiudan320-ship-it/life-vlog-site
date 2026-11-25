/** Images and the game canvas should not trigger the browser's save-image menu. */
export function preventImageCallouts(document) {
  document.addEventListener("contextmenu", (event) => {
    if (event.target instanceof Element && event.target.closest("img,canvas")) event.preventDefault();
  });
}
