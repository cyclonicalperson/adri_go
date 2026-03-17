import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Map } from './map/map';

export const routes: Routes = [
    {path:'',component:Home},
    {path:'map',component:Map}
];
