from django.urls import path
from user.views import user_sign_up

app_name = 'user'

urlpatterns = [
    path('', user_sign_up, name='sign_up'),
]
