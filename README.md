# Machine Learning to forecast electricity consumption

### Deploy app

kubect apply -f backend_deploy.yaml
kubect apply -f backend_service.yaml
kubect apply -f tfserving_deploy.yaml
kubect apply -f tfserving_serving.yaml

# Access the app once deployed

http://localhost:5000
