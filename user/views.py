from django.shortcuts import render, redirect
from user.forms import UserSignUpForm
from django.contrib.auth import authenticate, login


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
