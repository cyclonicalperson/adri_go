import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductsService, Product } from '../../services/products.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './products.component.html',
  styleUrl: './products.component.css'
})
export class ProductsComponent implements OnInit {
  products: Product[] = [];
  selectedProduct: Product | null = null;
  isEditing = false;

  newProduct: Product = {
    id: 0, name: '', price: 0, quantity: 0, createdAt: new Date().toISOString()
  };

  constructor(private productService: ProductsService) {}

  ngOnInit() {
    this.loadProducts();
  }

  loadProducts() {
    this.productService.getAll().subscribe(data => this.products = data);
  }

  save() {
    if (this.isEditing && this.selectedProduct) {
      this.productService.update(this.selectedProduct.id, this.selectedProduct)
        .subscribe(() => { this.loadProducts(); this.cancel(); });
    } else {
      this.productService.create(this.newProduct)
        .subscribe(() => { this.loadProducts(); this.resetForm(); });
    }
  }

  edit(product: Product) {
    this.selectedProduct = { ...product };
    this.isEditing = true;
  }

  delete(id: number) {
    this.productService.delete(id).subscribe(() => this.loadProducts());
  }

  cancel() {
    this.isEditing = false;
    this.selectedProduct = null;
  }

  resetForm() {
    this.newProduct = { id: 0, name: '', price: 0, quantity: 0, createdAt: new Date().toISOString() };
  }
}