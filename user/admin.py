from django.contrib import admin
from user.models import User


class UserAdmin(admin.ModelAdmin):
    list_display = ['username', 'email', 'bio', 'birth_year']


admin.site.register(User, UserAdmin)
# Register your models here.
