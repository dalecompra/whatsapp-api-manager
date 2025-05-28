# WhatsApp API Manager

Panel de gestión para múltiples instancias de WhatsApp con API REST.

## Características

- Creación de múltiples instancias de WhatsApp
- Panel web para gestión de instancias
- API REST para integración con otros sistemas
- Soporte para múltiples números de WhatsApp
- Gestión de sesiones persistentes

## Requisitos

- Node.js 18 o superior
- npm o yarn
- Docker (opcional, para despliegue)

## Instalación

1. Clonar el repositorio:
```bash
git clone https://github.com/tu-usuario/whatsapp-api-manager.git
cd whatsapp-api-manager
```

2. Instalar dependencias:
```bash
npm install
```

3. Crear archivo .env:
```
NODE_ENV=production
PORT=3000
```

4. Iniciar la aplicación:
```bash
npm start
```

## Uso

### Panel Web

Accede al panel web en `http://localhost:3000` para:
- Crear nuevas instancias
- Ver códigos QR
- Gestionar instancias existentes
- Enviar mensajes

### API REST

#### Crear Instancia
```bash
POST /instances
{
    "instanceId": "nombre-instancia",
    "phoneNumber": "18096153168"
}
```

#### Enviar Mensaje
```bash
POST /instances/{instanceId}/send-message
{
    "number": "18096153168",
    "message": "¡Hola desde la API!"
}
```

#### Ver Estado
```bash
GET /instances/{instanceId}/status
```

#### Eliminar Instancia
```bash
DELETE /instances/{instanceId}
```

## Despliegue

### DigitalOcean + EasyPanel

1. Crear Droplet en DigitalOcean
2. Instalar EasyPanel
3. Configurar proyecto en EasyPanel
4. Desplegar aplicación

## Seguridad

- Usar HTTPS en producción
- Implementar autenticación
- Limitar acceso por IP
- Proteger variables de entorno

## Licencia

MIT 