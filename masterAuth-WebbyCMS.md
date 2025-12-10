API Endpoint URL: https://n8n.brandon.my/webhook/v1/api/
Documentation: All responses will be return status code 200

User Register
API: auth/register
Method: POST
Payload:
{
  "email": "brandon@kkbuddy.com",
  "password": "#Quidents64#",
  "apps": "post-man-test"
}

Responses:
{
  "status": "success-registered",
  "password_key": "1764765529466"
}

Error Responses:
{
  "status": "already-registered"
}

{
  "status": "invalid-registration"
}

User Login
API: auth/login
Method: POST
Payload:
{
  "email": "brandon@kkbuddy.com",
  "apps": "post-man-test",
  "password": "#Quidents64#"
}

Responses:
{
    "status": "success-login",
    "session": "1764767648049",
    "password_key": "1764765610241"
}
Can use the password_key to saved in cookie to be used in Sync and Download data.

Error Responses:
{
  "status": "invalid-login"
}

{
  "status": "user-not-found"
}

Get User App Data & Config
API: config/app
Method: GET
Payload:
{
  "email": "brandon@kkbuddy.com",
  "apps": "post-man-test",
  "password_key": "1764765610241"
}

Responses:
New Data -> POST API (config/app) to update DATA
{
  "success": "data-found",
  "last_sync": "new-data",
  "data": { }
}

Have Data -> Replace data in localstorage
{
    "success": "data-found",
    "last_sync": "2025-12-03T14:38:21.205Z",
    "data": "{\"version\":\"2.1.0\",\"minimum_version\":\"2.0.0\",\"force_update\":false,\"maintenance_mode\":false,\"maintenance_message\":null}"
}

Error Responses:
{
  "status": "invalid-password_key"
}

{
  "status": "invalid-requeest"
}

Update User App Data & Config
API: config/app
Method: POST
Payload:
{
  "email": "brandon@kkbuddy.com",
  "apps": "post-man-test",
  "password_key": "1764765610241",
  "app_data": { //All App data stored in LocalStorage (JSON) }
}

Responses:
{
  "success": "data-updated"
}

Error Responses:
{
  "status": "data-update-failed"
}