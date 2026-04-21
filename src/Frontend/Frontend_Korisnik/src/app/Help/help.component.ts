import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './help.component.html',
  styleUrls: ['./help.component.css']
})
export class HelpComponent {

  openFaq: number | null = null;

  faqs = [
    {
      q: 'How do I save a location?',
      a: 'Tap any location on the map or in the list, then press the bookmark icon on the location card. Saved places are available in the Saved tab.'
    },
    {
      q: 'How does the Recommended section work?',
      a: 'Our algorithm ranks locations based on rating, number of reviews, likes, and saves. The highest scoring destinations appear at the top.'
    },
    {
      q: 'Can I filter locations by category?',
      a: 'Yes! Tap the "Filters" button in the search bar or use the category filter panel on the map to show only the types of places you are interested in.'
    },
    {
      q: 'How do I report incorrect information about a location?',
      a: 'Open the location detail page and scroll to the bottom. Tap "Report an issue" and fill in the form. Our team reviews reports within 24–48 hours.'
    },
    {
      q: 'Is AdriGo available offline?',
      a: 'Basic map tiles are cached after your first visit. However, live search and recommendations require an internet connection.'
    },
    {
      q: 'How do I delete my account?',
      a: 'Go to Account → Privacy & Terms → Delete Account. This action is permanent and removes all your data from our servers.'
    }
  ];

  toggleFaq(index: number) {
    this.openFaq = this.openFaq === index ? null : index;
  }

  goBack() { window.history.back(); }

  contactSupport() {
    window.location.href = 'mailto:support@adrigo.app';
  }
}