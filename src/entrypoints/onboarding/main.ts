import { hasHostAccess, requestHostAccess } from '@/permissions/hostAccess';

const button = document.querySelector<HTMLButtonElement>('#grant');
const status = document.querySelector<HTMLParagraphElement>('#status');

function showGranted(): void {
  if (button) button.hidden = true;
  if (status) status.textContent = "You're all set. Open facebook.com and you'll land on Marketplace.";
}

void hasHostAccess().then((granted) => {
  if (granted) showGranted();
});

button?.addEventListener('click', () => {
  // Called synchronously in the click handler: browsers only show the
  // permission prompt in direct response to a user action.
  void requestHostAccess().then((granted) => {
    if (granted) showGranted();
    else if (status) status.textContent = 'Permission was not granted. MarketplaceOnly stays inactive until you allow it.';
  });
});
