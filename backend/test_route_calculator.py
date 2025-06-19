#!/usr/bin/env python3
"""
Script de pruebas para el servicio de cálculo de rutas para camiones.
"""

import sys
import os
import unittest
import json
import datetime
from unittest.mock import MagicMock, patch

# Añadir el directorio padre al path para poder importar el módulo
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Importar el módulo a probar
from services.routeCalculator import TruckRouteCalculator

class TestTruckRouteCalculator(unittest.TestCase):
    """
    Pruebas unitarias para el calculador de rutas para camiones.
    """
    
    def setUp(self):
        """
        Configuración inicial para las pruebas.
        """
        self.calculator = TruckRouteCalculator()
        
        # Origen y destino de prueba
        self.origin = {'lat': 40.4168, 'lng': -3.7038}  # Madrid
        self.destination = {'lat': 41.3851, 'lng': 2.1734}  # Barcelona
        
        # Parámetros del vehículo de prueba
        self.vehicle_params = {
            'height': 4.2,  # metros
            'width': 2.5,   # metros
            'length': 16.5, # metros
            'weight': 40,   # toneladas
            'axleCount': 5
        }
        
        # Hora de salida fija para pruebas
        self.departure_time = datetime.datetime(2025, 6, 5, 8, 0, 0)
    
    def test_get_speed_limit(self):
        """
        Prueba la obtención de límites de velocidad por país y tipo de vía.
        """
        # Prueba para España, autopista
        self.assertEqual(self.calculator.get_speed_limit('motorway', 'ES'), 90)
        
        # Prueba para Alemania, vía urbana
        self.assertEqual(self.calculator.get_speed_limit('residential', 'DE'), 50)
        
        # Prueba para país no definido, debería usar valores por defecto
        self.assertEqual(self.calculator.get_speed_limit('motorway', 'XX'), 
                         self.calculator.DEFAULT_SPEED_LIMITS['motorway'])
        
        # Prueba para tipo de vía no definido, debería usar valor por defecto
        self.assertEqual(self.calculator.get_speed_limit('unknown_road_type', 'ES'), 
                         self.calculator.DEFAULT_SPEED_LIMITS['default'])
    
    def test_calculate_distance(self):
        """
        Prueba el cálculo de distancia entre dos puntos.
        """
        # Distancia aproximada entre Madrid y Barcelona: ~505 km
        distance = self.calculator._calculate_distance(
            self.origin['lat'], self.origin['lng'],
            self.destination['lat'], self.destination['lng']
        )
        
        # Verificar que la distancia está en el rango esperado (500-510 km)
        self.assertTrue(500000 <= distance <= 510000, 
                       f"Distancia calculada ({distance/1000} km) fuera del rango esperado (500-510 km)")
    
    def test_calculate_route_short(self):
        """
        Prueba el cálculo de una ruta corta que no requiere descansos.
        """
        # Origen y destino cercanos (Madrid - Toledo, ~70 km)
        origin = {'lat': 40.4168, 'lng': -3.7038}  # Madrid
        destination = {'lat': 39.8628, 'lng': -4.0273}  # Toledo
        
        # Calcular ruta
        route = self.calculator.calculate_route(
            origin=origin,
            destination=destination,
            vehicle_params=self.vehicle_params,
            departure_time=self.departure_time
        )
        
        # Verificar que la ruta se calculó correctamente
        self.assertEqual(route['status'], 'success')
        
        # Verificar que no hay descansos requeridos (ruta corta)
        self.assertTrue(len(route['required_breaks']) == 0, 
                       f"No deberían haber descansos para una ruta corta, pero se encontraron {len(route['required_breaks'])}")
    
    def test_calculate_route_medium(self):
        """
        Prueba el cálculo de una ruta media que requiere al menos una pausa.
        """
        # Calcular ruta Madrid - Barcelona (~600 km)
        route = self.calculator.calculate_route(
            origin=self.origin,
            destination=self.destination,
            vehicle_params=self.vehicle_params,
            departure_time=self.departure_time
        )
        
        # Verificar que la ruta se calculó correctamente
        self.assertEqual(route['status'], 'success')
        
        # Verificar que hay al menos una pausa (4.5h de conducción continua)
        self.assertTrue(len(route['required_breaks']) >= 1, 
                       f"Debería haber al menos una pausa para una ruta de ~600 km")
        
        # Verificar que la primera pausa es de tipo 'break' (45 minutos)
        if len(route['required_breaks']) > 0:
            self.assertEqual(route['required_breaks'][0]['type'], 'break')
            self.assertEqual(route['required_breaks'][0]['duration'], self.calculator.REQUIRED_BREAK)
    
    def test_calculate_route_long(self):
        """
        Prueba el cálculo de una ruta larga que requiere descansos diarios.
        """
        # Origen y destino lejanos (Madrid - Berlín, ~2300 km)
        origin = {'lat': 40.4168, 'lng': -3.7038}  # Madrid
        destination = {'lat': 52.5200, 'lng': 13.4050}  # Berlín
        
        # Calcular ruta
        route = self.calculator.calculate_route(
            origin=origin,
            destination=destination,
            vehicle_params=self.vehicle_params,
            departure_time=self.departure_time
        )
        
        # Verificar que la ruta se calculó correctamente
        self.assertEqual(route['status'], 'success')
        
        # Verificar que hay al menos un descanso diario
        daily_rests = [b for b in route['required_breaks'] if b['type'] == 'daily_rest']
        self.assertTrue(len(daily_rests) >= 1, 
                       f"Debería haber al menos un descanso diario para una ruta de ~2300 km")
        
        # Verificar que hay múltiples pausas
        breaks = [b for b in route['required_breaks'] if b['type'] == 'break']
        self.assertTrue(len(breaks) >= 2, 
                       f"Debería haber múltiples pausas para una ruta de ~2300 km")
    
    def test_optimize_rest_stops(self):
        """
        Prueba la optimización de paradas de descanso.
        """
        # Calcular ruta
        route = self.calculator.calculate_route(
            origin=self.origin,
            destination=self.destination,
            vehicle_params=self.vehicle_params,
            departure_time=self.departure_time
        )
        
        # Simular áreas de descanso
        rest_areas = self.calculator.find_rest_areas(route)
        
        # Optimizar paradas
        optimized_route = self.calculator.optimize_rest_stops(route, rest_areas)
        
        # Verificar que la optimización se realizó correctamente
        self.assertEqual(optimized_route['status'], 'success')
        
        # Verificar que al menos una parada tiene un área de descanso asignada
        if len(optimized_route['required_breaks']) > 0:
            areas_assigned = [b for b in optimized_route['required_breaks'] if 'rest_area' in b]
            self.assertTrue(len(areas_assigned) > 0, 
                          f"Debería haber al menos una parada con área de descanso asignada")
    
    def test_departure_arrival_times(self):
        """
        Prueba que los tiempos de salida y llegada son correctos.
        """
        # Calcular ruta
        route = self.calculator.calculate_route(
            origin=self.origin,
            destination=self.destination,
            vehicle_params=self.vehicle_params,
            departure_time=self.departure_time
        )
        
        # Verificar que la hora de salida es la especificada
        self.assertEqual(route['departure_time'], self.departure_time)
        
        # Verificar que la hora de llegada es posterior a la de salida
        self.assertTrue(route['arrival_time'] > self.departure_time)
        
        # Verificar que la duración con descansos es mayor que la duración base
        self.assertTrue(route['duration_with_breaks'] > route['duration'])
        
        # Verificar que la diferencia entre salida y llegada coincide con la duración con descansos
        time_diff = (route['arrival_time'] - route['departure_time']).total_seconds()
        self.assertAlmostEqual(time_diff, route['duration_with_breaks'], delta=1)  # Tolerancia de 1 segundo

if __name__ == '__main__':
    unittest.main()

