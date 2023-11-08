from django.shortcuts import render


def user_sign_up(request):
    return render(request, 'user_sign_up/sign_up.html')
# Create your views here.
