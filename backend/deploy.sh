#!/bin/bash

# Script para construir y desplegar la aplicación backend de Truking GPS

# Colores para mensajes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Iniciando despliegue de Truking GPS Backend...${NC}"

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: No se encontró package.json. Asegúrate de ejecutar este script desde el directorio backend.${NC}"
    exit 1
fi

# Verificar que Python está instalado
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python 3 no está instalado. Es necesario para los algoritmos de cálculo de rutas.${NC}"
    exit 1
fi

# Instalar dependencias de Node.js
echo -e "${YELLOW}Instalando dependencias de Node.js...${NC}"
npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Falló la instalación de dependencias de Node.js.${NC}"
    exit 1
fi

# Verificar dependencias de Python
echo -e "${YELLOW}Verificando dependencias de Python...${NC}"
python3 -c "import sys, math, datetime, json" 2>/dev/null

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Faltan algunas dependencias de Python necesarias.${NC}"
    exit 1
fi

# Ejecutar pruebas
echo -e "${YELLOW}Ejecutando pruebas...${NC}"
npm test

if [ $? -ne 0 ]; then
    echo -e "${RED}Advertencia: Algunas pruebas han fallado. Revisa los errores antes de continuar.${NC}"
    read -p "¿Deseas continuar con el despliegue? (s/n): " continue_deploy
    if [ "$continue_deploy" != "s" ]; then
        echo -e "${YELLOW}Despliegue cancelado.${NC}"
        exit 1
    fi
fi

# Verificar archivo .env
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}No se encontró el archivo .env. Creando uno a partir de .env.example...${NC}"
    
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${YELLOW}Archivo .env creado. Por favor, edita el archivo con tus configuraciones antes de continuar.${NC}"
        read -p "Presiona Enter cuando hayas terminado de editar .env..."
    else
        echo -e "${RED}Error: No se encontró .env.example para crear .env.${NC}"
        exit 1
    fi
fi

# Desplegar la aplicación
echo -e "${YELLOW}Desplegando la aplicación...${NC}"

# Aquí puedes agregar comandos específicos para tu plataforma de despliegue
# Por ejemplo, para Heroku:
# heroku container:push web
# heroku container:release web

# Para AWS Elastic Beanstalk:
# eb deploy

# Para este ejemplo, usaremos el servicio de despliegue de backend de Manus
echo -e "${YELLOW}Desplegando con service_deploy_backend...${NC}"
service_deploy_backend --framework=flask --project_dir=$(pwd)

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Falló el despliegue de la aplicación.${NC}"
    exit 1
fi

echo -e "${GREEN}¡Despliegue completado con éxito!${NC}"
echo -e "${GREEN}La API está disponible en la URL proporcionada arriba.${NC}"

exit 0

