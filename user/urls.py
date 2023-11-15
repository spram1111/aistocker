from django.urls import path
from user.views import user_sign_up, user_login, user_logout

app_name = 'user'

urlpatterns = [
    path('', user_sign_up, name='sign_up'),
    path('login/', user_login, name='login'),
    path('logout/', user_logout, name='logout'),
]
