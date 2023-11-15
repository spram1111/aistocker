from django.shortcuts import render, redirect
from user.forms import UserSignUpForm
from django.contrib.auth import authenticate, login, logout
from django.conf import settings
from django.contrib import messages


User = settings.AUTH_USER_MODEL


def user_sign_up(request):

    if request.method == 'POST':
        form = UserSignUpForm(request.POST or None)
        if form.is_valid():
            new_user = form.save()
            new_user = authenticate(username=form.cleaned_data['email'],
                                    password=form.cleaned_data['password1'])
            login(request, new_user)
            return redirect('main:index')
        else:
            print(form.errors)
    else:
        form = UserSignUpForm()
        print('user cannot be registered')

    context = {
        'form': form
    }

    return render(request, 'user_sign_up/sign_up.html', context)


def user_login(request):
    if request.user.is_authenticated:
        return redirect('main:index')

    if request.method == 'POST':
        email = request.POST.get('email')
        password = request.POST.get('password')

        try:
            user = User.objects.get(email=email)
        except Exception:
            messages.warning(request,
                             f'Пользователя с почтой {email}, не существует')
        user = authenticate(request, email=email, password=password)

        if user is not None:
            login(request, user)
            messages.success(request, 'Все окей, проходи')
            return redirect('main:index')
        else:
            messages.warning(request, 'Пользователя не существует')
    context = {

    }
    return render(request, 'user_sign_up/login.html', context)


def user_logout(request):
    logout(request)
    return redirect('user:login')
